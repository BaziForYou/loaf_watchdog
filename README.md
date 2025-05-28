# Watchdog

A FiveM script that automatically restarts resources when a `.lua` file is saved, created or deleted.

The watchdog also has the ability to automatically delete all entities created by resources when they are stopped. To enable this feature, set `DELETE_ENTITIES` to `true` in the `config.json`.

## Installation

1. Add the script to your `resources` folder
2. Add `add_ace resource.loaf_watchdog command.refresh allow` to your `server.cfg` to allow the script to refresh resources
3. Add `start loaf_watchdog` to the bottom of your `server.cfg`
4. Restart your server
