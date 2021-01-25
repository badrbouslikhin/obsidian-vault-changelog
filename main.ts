import { MarkdownView, Plugin } from "obsidian";
import dayjs from "dayjs";

export default class MyPlugin extends Plugin {
  onload() {
    console.log("loading plugin");

    const writeChangelog = () => {
      const files = this.app.vault.getMarkdownFiles();
      const sorted_files = files
        .sort((a, b) => (a.stat.mtime < b.stat.mtime ? 1 : -1))
        .slice(0, 5);
      this.writeChangelog(sorted_files);
    };

    this.addCommand({
      id: "write-changelog-to-current-note",
      name: "Write changelog to current note",
      callback: writeChangelog,
      hotkeys: [],
    });

    this.registerEvent(this.app.vault.on("modify", this.watchVault))
  }

  watchVault() {
    console.log("Vault has changed");
  }

  writeChangelog(recentlyEditedFiles: any) {
    console.log("Writing changelog");
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      // Do work here
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
