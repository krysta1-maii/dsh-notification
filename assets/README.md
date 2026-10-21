# Plugin icon

[icon.svg](<icon.svg>) uses the **bell-ringing** paths from [Tabler Icons](https://tabler.io/icons/icon/bell-ringing), pinned to [v3.35.0](https://github.com/tabler/tabler-icons/blob/v3.35.0/icons/outline/bell-ringing.svg).

The bell represents completion and pending-interaction reminders. The paths are unchanged; the white stroke, blue rounded background, translation and canvas size are local adaptations. Explicit colors keep the image legible in both light and dark themes without inheriting CSS from the host.

Tabler Icons is MIT-licensed, copyright (c) 2020-2025 Paweł Kuna. The complete [license](<LICENSE-tabler.txt>) is shipped with the icon; [upstream license](https://github.com/tabler/tabler-icons/blob/v3.35.0/LICENSE).

The top-level `icon` field in [package.json](<../package.json>) points to this local SVG. The `assets` directory is included in the package file list, so installed copies need no external image request. Icon loading is verified against DSH 0.2.1-rc.2; development dependencies remain pinned to 0.2.0-rc.2. Older hosts without icon metadata support keep the existing notification behavior.
