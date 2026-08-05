# Fire Control Interface Design

Date: 2026-08-05

## Subject and job

The interface is a field armorer's inspection console for a stylized steampunk ballista. Its single job is to keep the reconstructed object dominant while making its motion and construction easy to inspect.

## Token system

- Powder sky `#dceaff`: scene atmosphere and light-mode field.
- Deep blueprint `#0e1723`: dark-mode field and primary type.
- Oxidized teal `#245b5d`: selected controls and structural accents.
- Furnace brass `#c7923e`: bearings, scale ticks, and focus states.
- Warning ember `#ff7a3d`: the fire action and live lens status.
- Parchment `#f3ede0`: light text and gauge faces.

Type roles use installed system faces only, preserving an offline runtime. `Iowan Old Style` gives the object name an engraved equipment-plate character. `Avenir Next` carries controls. `SFMono-Regular` carries angles, states, and part IDs.

## Layout

Desktop keeps the 3D model as the full-bleed hero. A clipped identity plate floats at top left. A narrow fire-control rack sits on the right. A synchronized brass bearing scale anchors the bottom edge.

```text
+----------------------------------------------------------+
| [ BALLISTA / FIELD UNIT 06 ]                  [mode]      |
|                                                          |
|                    live 3D object            +---------+  |
|                                              | yaw     |  |
|                                              | elevate |  |
|                                              | explode |  |
|                                              | FIRE    |  |
|                                              +---------+  |
|          105  75  45  15  0  15  45  75  105            |
+----------------------------------------------------------+
```

Mobile keeps the model in the upper field and turns controls into a compact lower rack with two columns. The fire control remains reachable with one thumb.

## Signature

The synchronized bearing scale is the distinctive gesture. It belongs to the turret's rotating brass ring, communicates real yaw state, and makes the page feel like a mechanical instrument rather than a generic product viewer.

## Self-critique

The first direction risked becoming a familiar dark game HUD. The revised palette uses the reference's powder-blue studio atmosphere in light mode and a blue-black inspection bay in dark mode. Decoration is restricted to clipped corners, bearing ticks, and one ember action. The model, not the chrome, remains the hero.
