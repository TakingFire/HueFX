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

#### Patch 0.3.1:
+ Added Exit button

* Fixed active presets being fixed at 4 slots
* Fixed cycle speed desync if changed while animating
* Fixed color flicker when audio hit max volume
* Tweaked frequency bands for better representation


#### Version 0.4.0:
+ Added options menu
  + Added buttons to import/export preferences
  + Added toggle to use mic/webcam instead of desktop
+ Added optional tray icon with light shortcuts

* Shortened header buttons
* Raised min audio smoothing from 0.5 to 0.7
* Changed audio mode description

#### Version 0.5.0:
+ Added light mode 'video'
  + Added region option for center/left/right/top/bottom
  + Added separate smoothing option for video
+ Added Done button in options menu

* Fixed presets menu going offscreen if too low
* Removed transition on color inputs
* Minor cleanup
