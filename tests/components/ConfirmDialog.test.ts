// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import ConfirmDialog from "../../components/ConfirmDialog.vue";

/**
 * A question that has to be answered before anything else: a modal alertdialog named by its question (and described by its
 * detail, when it has one), focus starting on the safe answer (Cancel), the confirm button naming the action, Escape and a
 * click on the dimmed page answering "cancel", and focus handed back when it closes. With several choices it shows a button for each and reports which was pressed. What the
 * browser itself does in a modal dialog (trapping Tab, making the page behind inert) is checked in each project's browser tests.
 */

// jsdom has <dialog> but not its modal behaviour; give it the minimum.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

afterEach(() => {
  document.body.innerHTML = "";
});

/** A dialog with one confirm button, on the page. */
function mountDialog() {
  return mount(ConfirmDialog, {
    props: { question: "Delete Sam and all their history?", confirmLabel: "Delete client" },
    attachTo: document.body,
  });
}

const CHOICES = [
  { value: "thisWeek", label: "This week only" },
  { value: "everyWeek", label: "Every week" },
];

/** A dialog with a button per choice, on the page. */
function mountChoices() {
  return mount(ConfirmDialog, {
    props: { question: "Remove Back Squat from which weeks?", choices: CHOICES },
    attachTo: document.body,
  });
}

describe("ConfirmDialog", () => {
  it("opens as a modal dialog named by its question", async () => {
    const wrapper = mountDialog();
    await nextTick();

    const dialog = wrapper.get("dialog");
    expect(dialog.attributes("open")).toBeDefined();
    expect(dialog.attributes("role")).toBe("alertdialog");
    const labelId = dialog.attributes("aria-labelledby")!;
    expect(wrapper.get(`#${labelId}`).text()).toBe("Delete Sam and all their history?");
  });

  it("shows its detail under the question and is described by it", async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        question: "Restore this backup?",
        confirmLabel: "Restore Backup",
        detail: "It will replace the current log. This cannot be undone.",
      },
      attachTo: document.body,
    });
    await nextTick();

    const descriptionId = wrapper.get("dialog").attributes("aria-describedby")!;
    expect(wrapper.get(`#${descriptionId}`).text()).toBe("It will replace the current log. This cannot be undone.");
  });

  it("without a detail, has no description", () => {
    const wrapper = mountDialog();

    expect(wrapper.get("dialog").attributes("aria-describedby")).toBeUndefined();
    expect(wrapper.find(".detail").exists()).toBe(false);
  });

  it("starts with focus on Cancel, the safe answer", async () => {
    const wrapper = mountDialog();
    await nextTick();

    expect(document.activeElement).toBe(wrapper.get("button.cancelButton").element);
  });

  it("the confirm button names the action, and pressing it emits confirm", async () => {
    const wrapper = mountDialog();

    const confirm = wrapper.get("button.confirmButton");
    expect(confirm.text()).toBe("Delete client");
    await confirm.trigger("click");
    expect(wrapper.emitted("confirm")).toEqual([[]]);
  });

  it("Cancel emits cancel", async () => {
    const wrapper = mountDialog();

    await wrapper.get("button.cancelButton").trigger("click");

    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("Escape (the dialog's cancel event) emits cancel, and the browser is told not to close the dialog itself", async () => {
    const wrapper = mountDialog();
    const cancelEvent = new Event("cancel", { cancelable: true });

    wrapper.get("dialog").element.dispatchEvent(cancelEvent);

    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it("a click on the dimmed page around the card emits cancel; a click on the card does not", async () => {
    const wrapper = mountDialog();

    await wrapper.get(".question").trigger("click");
    expect(wrapper.emitted("cancel")).toBeUndefined();

    await wrapper.get("dialog").trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("gives focus back to whatever opened it when it closes", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const wrapper = mountDialog();
    await nextTick();

    wrapper.unmount();

    expect(document.activeElement).toBe(opener);
  });

  it("its buttons never submit a surrounding form", () => {
    const wrapper = mountDialog();

    for (const button of wrapper.findAll("button")) {
      expect(button.attributes("type")).toBe("button");
    }
  });
});

describe("ConfirmDialog with several choices", () => {
  it("shows a button per choice, in order, with Cancel last", () => {
    const wrapper = mountChoices();

    const labels = wrapper.findAll("button").map((button) => button.text());
    expect(labels).toEqual(["This week only", "Every week", "Cancel"]);
  });

  it("reports which choice was pressed", async () => {
    const wrapper = mountChoices();

    await wrapper.get('button[data-choice="everyWeek"]').trigger("click");

    expect(wrapper.emitted("confirm")).toEqual([["everyWeek"]]);
  });

  it("still starts with focus on Cancel", async () => {
    const wrapper = mountChoices();
    await nextTick();

    expect(document.activeElement).toBe(wrapper.get("button.cancelButton").element);
  });

  // Its centring (the card's auto margins in the dialog's grid) needs the card to be the dialog's only child; the layout itself
  // (a parent's `> * { margin: 0 }` not moving it) is measured in a real browser by `npm run a11y`, since jsdom does not apply
  // the component's stylesheet or compute layout.
  it("holds the card as its only child, which is what its centring relies on", () => {
    const wrapper = mountDialog();

    const dialog = wrapper.get("dialog").element;
    expect(dialog.children).toHaveLength(1);
    expect(dialog.children[0]?.classList.contains("confirmCard")).toBe(true);
  });

  describe("the confirm button's tone", () => {
    it("is danger when the caller says nothing, as every dialog was before tones existed", () => {
      const wrapper = mountDialog();

      expect(wrapper.get("button.confirmButton").classes()).toContain("btnDanger");
      expect(wrapper.get("button.confirmButton").classes()).not.toContain("btnPrimary");
    });

    it("is primary on the single form when asked, and Cancel stays secondary and first to take focus", async () => {
      const wrapper = mount(ConfirmDialog, {
        props: { question: "Send the food log?", confirmLabel: "Send Food Log", confirmTone: "primary" },
        attachTo: document.body,
      });
      await nextTick();

      const confirm = wrapper.get("button.confirmButton");
      expect(confirm.classes()).toContain("btnPrimary");
      expect(confirm.classes()).not.toContain("btnDanger");
      expect(wrapper.get("button.cancelButton").classes()).toContain("btnSecondary");
      expect(document.activeElement).toBe(wrapper.get("button.cancelButton").element);
    });

    it("is chosen per button among several choices, each defaulting to danger", () => {
      const wrapper = mount(ConfirmDialog, {
        props: {
          question: "Paste over this week?",
          choices: [
            { value: "copy", label: "Copy and Replace", confirmTone: "primary" },
            { value: "remove", label: "Remove Week" },
          ],
        },
        attachTo: document.body,
      });

      expect(wrapper.get('[data-choice="copy"]').classes()).toContain("btnPrimary");
      expect(wrapper.get('[data-choice="remove"]').classes()).toContain("btnDanger");
      expect(wrapper.get("button.cancelButton").classes()).toContain("btnSecondary");
    });
  });
});
