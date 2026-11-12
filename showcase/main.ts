import { createApp } from "vue";
import { hideStartupLoadingScreen } from "../js/loadingScreen.js";
// The library's look, loaded the way a project loads it (by its own path here, by package name there)
import "../css/index.css";
import ShowcasePage from "./ShowcasePage.vue";

createApp(ShowcasePage).mount("#app");
// The page is drawn, so the startup loading screen written into index.html by the plugin (vite.config.js) can go
void hideStartupLoadingScreen();
