import { MarkdownView, Plugin } from "obsidian";
import dayjs from "dayjs";

export default class Changelog extends Plugin {
  onInit() {}

  onload() {
    console.log("loading plugin");

    };

    this.addCommand({
      id: "write-changelog-to-current-note",
      name: "Write changelog to current note",
      callback: () => this.writeChangelog(),
      hotkeys: [],
    });

    this.registerEvent(this.app.vault.on("modify", this.watchVault));
  }

  watchVault() {
    console.log("Vault has changed");
  }

  writeChangelog() {
    console.log("Writing changelog");
    const files = this.app.vault.getMarkdownFiles();
    const recentlyEditedFiles = files
      .sort((a, b) => (a.stat.mtime < b.stat.mtime ? 1 : -1))
      .slice(0, this.setting.numberOfFilesToShow);
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      const editor = view.sourceMode.cmEditor;

      editor.execCommand("selectAll");

      for (let recentlyEditedFile of recentlyEditedFiles) {
        editor.replaceSelection("- ", "end");
        const humanTime = dayjs(recentlyEditedFile.stat.mtime);
        editor.replaceSelection(
          humanTime.format("YYYY-MM-DD [at] H[h]m"),
          "end"
        );
        editor.replaceSelection(" · ", "end");
        editor.replaceSelection(
          "[[" + recentlyEditedFile.basename + "]]\n",
          "end"
        );
      }
    }
  }

  onunload() {
    console.log("unloading plugin");
  }
}
