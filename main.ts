import { App, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";
import dayjs from "dayjs";

const DEFAULT_SETTINGS: ChangelogSettings = {
  numberOfFilesToShow: 10,
  changelogFilePath: "",
  watchVaultChange: false,
};

export default class Changelog extends Plugin {
  settings: ChangelogSettings;

  onload() {
    console.log("Loading Changelog plugin");

    this.loadSettings();

    this.addSettingTab(new ChangelogSettingsTab(this.app, this));

    this.addCommand({
      id: "write-changelog-to-current-note",
      name: "Write changelog to current note",
      callback: () => this.writeChangelog(),
      hotkeys: [],
    });

    this.registerWatchVaultEvents();
  }

  registerWatchVaultEvents() {
    if (this.settings.watchVaultChange) {
      console.log("Registering events");
      this.registerEvent(
        this.app.vault.on("create", (file) => this.watchVaultChange(file))
      );
      this.registerEvent(
        this.app.vault.on("modify", (file) => this.watchVaultChange(file))
      );
      this.registerEvent(
        this.app.vault.on("delete", (file) => this.watchVaultChange(file))
      );
      this.registerEvent(
        this.app.vault.on("rename", (file) => this.watchVaultChange(file))
      );
    }
  }

  watchVaultChange(file: any) {
    if (file.path == this.settings.changelogFilePath) {
      return;
    } else {
      this.writeChangelog();
    }
  }

  writeChangelog() {
    const changelog = this.buildChangelog();
    this.writeInFile(this.settings.changelogFilePath, changelog);
  }

  buildChangelog(): string {
    const files = this.app.vault.getMarkdownFiles();
    const recentlyEditedFiles = files
      .sort((a, b) => (a.stat.mtime < b.stat.mtime ? 1 : -1))
      .slice(0, this.settings.numberOfFilesToShow);
    let changelogContent = ``;
    for (let recentlyEditedFile of recentlyEditedFiles) {
      if (recentlyEditedFile.path == this.settings.changelogFilePath) {
        continue;
      } else {
        // TODO: make date format configurable (and validate it)
        const humanTime = dayjs(recentlyEditedFile.stat.mtime).format(
          "YYYY-MM-DD [at] H[h]m"
        );
        changelogContent += `- ${humanTime} · [[${recentlyEditedFile.basename}]]\n`;
      }
    }
    return changelogContent;
  }

  writeInFile(filePath: string, content: string) {
    const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
    // TODO: handle errors
    this.app.vault.modify(file, content);
  }

  loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, this.loadData());
  }

  saveSettings() {
    this.saveData(this.settings);
  }

  onunload() {
    console.log("Unloading Changelog plugin");
  }
}

interface ChangelogSettings {
  changelogFilePath: string;
  numberOfFilesToShow: number;
  watchVaultChange: boolean;
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
      .setName("Changelog file location")
      .setDesc("Changelog file absolute path")
      .addText((text) => {
        text
          .setPlaceholder("Example: Folder/Changelog.md")
          .setValue(settings.changelogFilePath)
          .onChange((value) => {
            settings.changelogFilePath = String(value);
            this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Number of recent files")
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
      .setName("Write changelog on vault change")
      .setDesc(
        "Update changelog on any vault change (create, modify, rename or delete a note)"
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
  }
}
