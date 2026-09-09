# Ozwell

Ozwell is a cheerful yellow octopus with round navy glasses, packaged as a custom pet for the Codex / ChatGPT desktop app.

![Ozwell animation preview](preview/ozwell.gif)

## Install

Download this repository using **Code → Download ZIP** and extract it, or clone it:

```sh
git clone https://github.com/mieweb/petozwell.git
```

Install the **ozwell** folder containing `pet.json` and `spritesheet.png`. Keep the two files together.

### macOS

1. In Finder, choose **Go → Go to Folder** (`Shift–Command–G`).
2. Enter `~/.codex`. Create a folder named `pets` inside it if needed.
3. Copy the extracted **ozwell** folder into **pets**.

The final files should be:

```text
~/.codex/pets/ozwell/pet.json
~/.codex/pets/ozwell/spritesheet.png
```

### Windows

1. Press `Win+R`, enter `%USERPROFILE%\.codex`, and press Enter.
2. Create a folder named `pets` inside it if needed. If `.codex` does not exist, create it in `%USERPROFILE%` first.
3. Copy the extracted **ozwell** folder into **pets**.

The final files should be:

```text
%USERPROFILE%\.codex\pets\ozwell\pet.json
%USERPROFILE%\.codex\pets\ozwell\spritesheet.png
```

If your organization sets a custom `CODEX_HOME`, install into its `pets` folder instead. Codex CLI inside WSL normally uses a separate Linux home; the Windows desktop app's default home is in the Windows user profile.

### Select Ozwell

Open **Settings → Pets**, select **Refresh**, then choose **Ozwell**. If he is hidden, choose **Wake Pet** from the command menu, or enter `/pet`.

If an Ozwell folder is already installed, keep a backup before replacing it. Refresh the pet list after an update.

## Company distribution

Share the repository or a distribution ZIP through your internal file-sharing service. IT can also copy the two files into each user's Codex home under `pets/ozwell`. Each user selects Ozwell in the app.

Test on one coworker's app version before a broad rollout. Installing the files does not automatically select the pet.

## Compatibility

- Sprite version: **2**.
- Format: transparent RGBA PNG, **1536 × 2288** pixels.
- Layout: **8 columns × 11 rows**, with **192 × 208** pixel cells.
- Includes idle, movement, waving, jumping, failure, waiting, working, review, and directional gaze frames.
- The package dimensions and manifest were checked against the desktop app installed on September 8, 2026. Windows runtime behavior has not been tested.
- The documented web uploader requires **1536 × 1872** pixels as of September 9, 2026. This desktop sheet would need a separate compatible export for that uploader.

## Build a distribution ZIP

Python 3 is needed only to build the ZIP; coworkers do not need Python to install the pet.

```sh
python3 scripts/build_package.py
```

On Windows:

```powershell
py -3 scripts/build_package.py
```

The script checks the manifest and PNG header, then writes `dist/ozwell-company.zip` with installation instructions, previews, and the pet folder. Generated archives are excluded from Git.

## Artwork

The artwork was generated from a supplied yellow octopus reference. Python processing removed the generated background and aligned the animation frames. The installed pet consists of its manifest and image; animation behavior is supplied by the app.

## Official documentation

- [Pets](https://learn.chatgpt.com/docs/pets)
- [Windows desktop app](https://learn.chatgpt.com/docs/windows/windows-app)
