# Product artwork for the landing page

These eight files are the images `website/index.html` uses. They came from the
design project the page was built from:

<https://claude.ai/design/p/b5601d89-0d84-43f4-b556-b88582b52466>

| File here | Source in the design project | Used by |
| --- | --- | --- |
| `live-location.png` | `uploads/Live Location.png` | hero, and the Live location feature card |
| `safe-zone.png` | `uploads/Safe Zone.png` | feature 01, safe zones |
| `journey-history.png` | `uploads/Journey History.png` | feature 02, journey history |
| `route.png` | `uploads/Route to your child.png` | feature 03, directions |
| `guardians.png` | `uploads/Multiple guardians.png` | feature 04, guardians |
| `settings.png` | `uploads/Setting Screen .png` | feature 05, settings |
| `tracker-app.jpg` | `uploads/Generated Image September 12, 2026 - 11_13PM.jpg` | the hardware section |
| `tracker-box.jpeg` | `uploads/Firsat generation.jpeg` | the pricing panel |

The six `.png` files are parent-app screenshots, roughly 880×1800. The two
photos show the tracker itself.

## If you replace one

`index.html` carries each image's real `width` and `height` so the page does
not shift while they load. Update those attributes if you swap in a file with
different dimensions. Everything except the hero image is lazy-loaded.

They total about 2.8 MB. If that ever needs to come down, re-encoding to WebP
is the obvious win; point the `src` attributes at the new files if you do.
