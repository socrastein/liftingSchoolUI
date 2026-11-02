import { createApp } from "vue";
// The library's look, loaded the way a project loads it (by its own path here, by package name there)
import "../css/index.css";
import ShowcasePage from "./ShowcasePage.vue";

createApp(ShowcasePage).mount("#app");
