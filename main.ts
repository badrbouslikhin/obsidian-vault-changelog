import { App, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";
import dayjs from "dayjs";

const DEFAULT_SETTINGS: ChangelogSettings = {
  numberOfFilesToShow: 10,
  changelogFilePath: "",
  watchVaultChange: false,
};

export default class Changelog extends Plugin {
  settings: ChangelogSettings;

  async onload() {
    console.log("Loading Changelog plugin");

    await this.loadSettings();

    this.addSettingTab(new ChangelogSettingsTab(this.app, this));

    this.addCommand({
      id: "update-changelog",
      name: "Update changelog",
      callback: () => this.writeChangelog(),
      hotkeys: [],
    });

    await this.registerWatchVaultEvents();
  }

  async registerWatchVaultEvents() {
    if (this.settings.watchVaultChange) {
      console.log("Registering events");
      this.registerEvent(
        this.app.vault.on(
          "modify",
          async (file) => await this.watchVaultChange(file)
        )
      );
      this.registerEvent(
        this.app.vault.on(
          "delete",
          async (file) => await this.watchVaultChange(file)
        )
      );
      this.registerEvent(
        this.app.vault.on(
          "rename",
          async (file) => await this.watchVaultChange(file)
        )
      );
    }
  }

  async watchVaultChange(file: any) {
    if (file.path == this.settings.changelogFilePath) {
      return;
    } else {
      await this.writeChangelog();
    }
  }

  async writeChangelog() {
    const changelog = this.buildChangelog();
    await this.writeInFile(this.settings.changelogFilePath, changelog);
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
          "YYYY-MM-DD [at] HH[h]mm"
        );
        changelogContent += `- ${humanTime} · [[${recentlyEditedFile.basename}]]\n`;
      }
    }
    return changelogContent;
  }

  async writeInFile(filePath: string, content: string) {
    const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
    // TODO: handle errors
    await this.app.vault.modify(file, content);
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
      .setDesc("Changelog file absolute path (including the extension)")
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
