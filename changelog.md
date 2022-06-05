#### Version 0.1.0:
+ Added persistent settings
+ Added peach-magenta palette (replacing neon)
+ Added light mode 'color' and single-color palette support
+ Added direction options for color cycle (forward, bounce, reverse)

- Fixed progress indicator breaking if expanded during animation
- Fixed start buttons not disabling if not reachable
- Fixed presets menu staying open if no preset is selected

* Temp fix for event handlers not binding on first init (auto reload)
* Perf: only do visual updates on slider movement


#### Version 0.2.0:
+ Added desktop application (converted to Electron)
+ Added placeholder lights during authorization

- Removed testing .light element

* Smaller default window size
* Temporary(?) app icon


#### Version 0.3.0:
+ Added light mode 'audio'
  + Added realtime light streaming
  + Added (shared) volume and smoothing options
  + Added frequency band option

* Improved behavior of start/stop buttons
* Fixed radio buttons becoming unchecked on update
* Various tweaks
