import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  debounce,
  TFile,
} from "obsidian";
import type moment from "moment";

const DEFAULT_SETTINGS: ChangelogSettings = {
  numberOfFilesToShow: 10,
  changelogFilePath: "",
  watchVaultChange: false,
  formatAsTable: false,
  timeFormatting: "YYYY-MM-DD [at] HH[h]mm",
};

declare global {
  interface Window {
    app: App;
    moment: typeof moment;
  }
}

// This is what Excalidraw does to get multiple lines in setting descriptions
// https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/d82815c56a3c11058e3d04b13ae4447a37775272/src/utils/Utils.ts#L621
const fragWithHTML = (html: string) =>
  createFragment((frag) => (frag.createDiv().innerHTML = html));

export default class Changelog extends Plugin {
  settings: ChangelogSettings;

  async onload() {
    console.log("Loading Changelog plugin");

    await this.loadSettings();

    this.addSettingTab(new ChangelogSettingsTab(this.app, this));

    this.addCommand({
      id: "update",
      name: "update",
      callback: () => this.writeChangelog(),
      hotkeys: [],
    });

    this.watchVaultChange = debounce(
      this.watchVaultChange.bind(this),
      200,
      false
    );
    this.registerWatchVaultEvents();
  }

  registerWatchVaultEvents() {
    if (this.settings.watchVaultChange) {
      this.registerEvent(this.app.vault.on("modify", this.watchVaultChange));
      this.registerEvent(this.app.vault.on("delete", this.watchVaultChange));
      this.registerEvent(this.app.vault.on("rename", this.watchVaultChange));
    } else {
      this.app.vault.off("modify", this.watchVaultChange);
      this.app.vault.off("delete", this.watchVaultChange);
      this.app.vault.off("rename", this.watchVaultChange);
    }
  }

  watchVaultChange(file: any) {
    if (file.path === this.settings.changelogFilePath) {
      return;
    } else {
      this.writeChangelog();
    }
  }

  async writeChangelog() {
    const changelog = this.buildChangelog();
    await this.writeInFile(this.settings.changelogFilePath, changelog);
  }

  buildChangelog(): string {
    const files = this.app.vault.getMarkdownFiles();
    const recentlyEditedFiles = files
      // Remove changelog file from recentlyEditedFiles list
      .filter(
        (recentlyEditedFile) =>
          recentlyEditedFile.path !== this.settings.changelogFilePath
      )
      .sort((a, b) => (a.stat.mtime < b.stat.mtime ? 1 : -1))
      .slice(0, this.settings.numberOfFilesToShow);

    let changelogContent = !this.settings.formatAsTable
      ? ``
      : `| Title | Date |\n| --- | --- |\n`;
    for (let recentlyEditedFile of recentlyEditedFiles) {
      const humanTime = window
        .moment(recentlyEditedFile.stat.mtime)
        .format(this.settings.timeFormatting);
      changelogContent += !this.settings.formatAsTable
        ? `- ${humanTime} · [[${recentlyEditedFile.basename}]]\n`
        : `| [[${recentlyEditedFile.basename}]] | ${humanTime} |\n`;
    }

    return changelogContent;
  }

  async writeInFile(filePath: string, content: string) {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
    } else {
      new Notice("Couldn't write changelog: check the file path");
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    console.log("Unloading Changelog plugin");
  }
}

interface ChangelogSettings {
  changelogFilePath: string;
  numberOfFilesToShow: number;
  watchVaultChange: boolean;
  formatAsTable: boolean;
  timeFormatting: string;
}

class ChangelogSettingsTab extends PluginSettingTab {
  plugin: Changelog;

  constructor(app: App, plugin: Changelog) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    const settings = this.plugin.settings;

    new Setting(containerEl)
      .setName("Changelog note location")
      .setDesc("Changelog file absolute path (including the extension)")
      .addText((text) => {
        text
          .setPlaceholder("Example: Folder/Changelog.md")
          .setValue(settings.changelogFilePath)
          .onChange((value) => {
            settings.changelogFilePath = value;
            this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Number of recent files in changelog")
      .setDesc("Number of most recently edited files to show in the changelog")
      .addText((text) =>
        text
          .setValue(String(settings.numberOfFilesToShow))
          .onChange((value) => {
            if (!isNaN(Number(value))) {
              settings.numberOfFilesToShow = Number(value);
              this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Automatically update changelog")
      .setDesc(
        "Automatically update changelog on any vault change (modification, renaming or deletion of a note)"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.watchVaultChange)
          .onChange((value) => {
            this.plugin.settings.watchVaultChange = value;
            this.plugin.saveSettings();
            this.plugin.registerWatchVaultEvents();
          })
      );

    new Setting(containerEl)
      .setName("Format changelog as a table")
      // .setDesc(
      //   "Automatically update changelog on any vault change (modification, renaming or deletion of a note)"
      // )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.formatAsTable)
          .onChange((value) => {
            this.plugin.settings.formatAsTable = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Time format")
      .setDesc(
        fragWithHTML(
          "Default is YYYY-MM-DD [at] HH[h]mm <br> For more syntax, refer to <a href='https://momentjs.com/docs/#/displaying/format/'>format reference</a>"
        )
      )
      .addText((text) => {
        text
          .setPlaceholder("YYYY-MM-DD [at] HH[h]mm")
          .setValue(String(settings.timeFormatting))
          .onChange((value) => {
            settings.timeFormatting = value;
            this.plugin.saveSettings();
          });
      });
  }
}
