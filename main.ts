import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";
import dayjs from "dayjs";

export default class Changelog extends Plugin {
  setting: ChangelogSettings;
  onInit() {}

  onload() {
    console.log("loading plugin");

    this.setting = {
      numberOfFilesToShow: 10,
    };

    this.addSettingTab(new ChangelogSettingsTab(this.app, this));

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

interface ChangelogSettings {
  numberOfFilesToShow: number;
}

class ChangelogSettingsTab extends PluginSettingTab {
  plugin: Changelog;

  constructor(app: App, plugin: Changelog) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.setting;
    new Setting(containerEl)
      .setName("Number of recent files")
      .setDesc("Number of most recently edited files to show in the changelog")
      .addText((text) =>
        text
          .setValue(String(settings.numberOfFilesToShow))
          .onChange((value) => {
            if (!isNaN(Number(value))) {
              settings.numberOfFilesToShow = Number(value);
              this.plugin.saveData(settings);
            }
          })
      );
  }
}
