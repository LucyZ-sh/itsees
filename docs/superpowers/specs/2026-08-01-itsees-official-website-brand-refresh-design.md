# Itsees Official Website Brand Refresh Design

Date: 2026-08-01  
Status: Approved design, pending implementation

## Objective

Refresh the existing bilingual Itsees official website so the brand is memorable before the feature explanation begins, all App screenshots are displayed at their true proportions, and the complete page feels more polished and intentional while retaining the travel-journal character of the product.

The refresh must solve three concrete problems:

1. The Itsees logo and product identity are currently too small to establish brand recognition.
2. Product screenshots feel stretched or unnaturally embedded because they are treated as tilted photographs and overlapping keepsakes.
3. Repeated paper treatments, labels, shadows, and reveal patterns make the page visually busy without improving the story.

## Brand Message

The hero's primary Chinese brand statement is:

> 世界这么大，让它带你去看看。  
> 它见过的世界，都会带回来给你。

The English version is:

> The world is wide. Let it take you there.  
> Every place it sees, it brings home to you.

The current line “漫长日常里，一位小小旅行家。” / “A little traveler for your long days.” remains as supporting copy, not the main headline.

The two brand-statement sentences are not rendered as one uniform display block. The first sentence is the invitation and receives the primary title treatment: approximately 44–48px on desktop, medium weight, and deep ink green. The second sentence is the reply and brand promise: approximately 30–34px on desktop, lighter weight, and warm coral-brown, with deliberate vertical space separating it from the invitation. Mobile sizes scale down while preserving the same hierarchy. English follows the same two-level structure.

## Visual Direction

The approved direction is **brand-first travel journal**.

The website remains warm and tactile because it is extending an existing product identity, but the journal language becomes more disciplined. Paper, route lines, coordinates, captions, and one destination stamp carry meaning. Decorative tape, repeated postmarks, broad shadows, and tilted product screenshots are reduced or removed.

The color system continues to use the App's existing ink green, coral, muted gold, and paper tones. Page rhythm varies by section:

- Hero: light journal paper with strong brand lockup.
- Journey: clean neutral surface that makes the App window authoritative.
- Atlas: low-saturation sage surface connected to maps and routes.
- Keepsakes: light collection surface with a single full product window.
- Closing section: deep Itsees green with the Teddy travel image.

Typography retains the existing serif and sans-serif pairing. Display letter spacing must not be tighter than `-0.04em`. Headings use balanced wrapping; supporting prose is limited to approximately 65–75 characters per line.

## Header and Brand Lockup

The sticky header uses a clearer Itsees lockup rather than a small icon followed by an unstructured word:

- Logo artwork at 44–48px on desktop and 36–40px on mobile.
- `ITSEES` wordmark and a small `Pet Travel Journal` descriptor arranged as one clickable home element.
- Journey, Atlas, Keepsakes, and language controls remain.
- The header stays compact and must not compete with the hero lockup.

## Hero Composition

The open-journal spread remains but is rebuilt around brand recognition.

### Left page

1. A prominent 88–104px Itsees logo.
2. `ITSEES / Pet Travel Journal` as a formal brand lockup.
3. The approved brand statement as the single page `<h1>`, with the first sentence as the primary invitation and the second sentence as a visibly smaller brand promise.
4. “A little traveler for your long days.” as supporting copy.
5. One short explanatory paragraph.
6. Beta status, journey link, supported platforms, and four-hour trip pace at lower visual priority.

### Right page

- The Paris travel scene remains the visual counterpoint.
- The image keeps its natural aspect ratio and uses a restrained journal mount.
- Only one meaningful Paris destination stamp remains.
- The caption responds to the main statement with the idea that what Itsees sees, it brings home.
- Destination count remains secondary.

The hero must establish, in order: Itsees identity, invitation, emotional promise, product explanation, beta action. The two headline sentences must not use the same size, weight, or color.

## Product Screenshot System

The two product captures embedded on the website are `1270×760` and must remain at the exact `127:76` ratio.

### Placement

- `product-journey.png` belongs to the Journey section.
- `product-keepsakes.png` belongs to the Keepsakes section.

The Atlas product capture is intentionally not shown. The Atlas section uses route artwork, real-world destination photography, and the horizontal world map only.

### Rendering contract

- Never rotate, skew, crop, or stretch a product capture.
- The image width is responsive; its rendered height follows the intrinsic ratio.
- Use `aspect-ratio: 127 / 76` on the media container as a layout reservation, and `object-fit: contain` as a defensive rule.
- The container has no conflicting fixed image height.
- Desktop maximum width is approximately 1100px.
- Mobile width is the available content width with no horizontal overflow.
- The full App UI must remain visible.

### Window frame

Each capture is displayed inside the same neutral desktop-window component:

- Thin top title bar.
- Small Itsees mark and feature name.
- Minimal window controls that do not imitate one specific operating system too literally.
- One border or one tight shadow, never a broad shadow combined with a decorative border.
- No polaroid mat, scrapbook rotation, or overlap with another App screenshot.

### Full-size inspection

Each screenshot is a semantic link to the same full-resolution source image. It opens in a new tab with a bilingual accessible label. The page must make the interaction discoverable without placing a large overlay on the image.

## Section Redesign

### Journey

The four-step sequence remains because its order communicates real behavior. It becomes visually lighter and leads into the full Journey App window. The screenshot caption explains that the journey continues locally while the user focuses.

### Atlas

The storybook and real-world distinction remains, but the two editorial panels lose broad card shadows. Route artwork and destination photography introduce the two modes. The world-map strip remains a quiet transition rather than a promotional banner. No full Atlas App screenshot is embedded in this section.

### Keepsakes

The current overlapping product screenshots and tilted note are removed. One full Keepsakes App window anchors the section. Postcards, souvenirs, and history appear as three text annotations below or beside the window, separated by rules instead of repeated cards. One traveler quote remains as a true journal insert.

### Local-first

The section is simplified into a clean two-column editorial note. It explains local state, no-account beta access, weather fallback, and recall/continue behavior without using a boxed feature-card pattern.

### Closing section

The Teddy Great Wall image and deep green field remain. The Itsees logo and wordmark return so the page ends with the same identity with which it began. The beta status remains non-clickable until a signed DMG URL is configured.

## Content and Internationalization

The current translation architecture remains in `site/site.js`.

- English remains the static HTML fallback and indexed default.
- Chinese is selected when the browser language begins with `zh`, unless the user has saved a manual choice.
- The new brand statement, window labels, full-size screenshot labels, and new captions require both English and Chinese strings.
- Language changes continue to update document language, title, description, and Open Graph locale.
- The storage key remains `itsees-site-language`.

## Interaction and Motion

- Page content is visible by default without JavaScript.
- JavaScript adds a motion-ready state only after initialization.
- Hero brand elements use one restrained stagger; product windows use a short mask or upward reveal; text sections do not all reuse the same animation.
- Hover on a product screenshot may slightly emphasize its title bar or inspection label, but the image itself does not scale enough to blur text.
- All motion has a reduced-motion path that is instant or a simple crossfade.
- Focus styles remain visible and all targets are at least 44px where practical.

## Responsive Behavior

### Desktop

- Hero uses a two-page spread.
- Product windows are centered and shown at full width within the 1100px media limit.
- Section typography and annotations use asymmetry without overlapping the UI captures.

### Tablet

- Hero pages stack.
- Section headers become one column.
- Product windows remain full-width and preserve `127:76`.
- Annotations move below the screenshot rather than floating over it.

### Mobile

- Header retains the brand mark, wordmark, and language switch; section navigation can remain hidden.
- Hero title wraps naturally without horizontal overflow.
- Product screenshots remain complete and unrotated.
- Full-size inspection links provide access to readable UI details.
- All decorative elements that compete with content are removed.

## Architecture and Files

The website remains a static site with no framework or backend.

- `site/index.html`: revised semantic layout and product-window components.
- `site/styles.css`: refreshed tokens, layout, screenshot ratio rules, and responsive behavior.
- `site/site.js`: new translations and motion initialization; existing configuration and language behavior remain.
- `site/site-config.js`: unchanged download and public-link configuration contract.
- `site/assets/`: existing product captures and logo remain the source of truth; no runtime dependency outside `site/`.
- `tests/officialWebsite.test.mjs`: expanded checks for logo lockup, brand copy, the Journey and Keepsakes screenshot placements, full-size links, the omitted Atlas screenshot, and exact aspect-ratio rules.

No deployment, DNS work, or signed DMG replacement is included in this refresh.

## Failure and Fallback Behavior

- With JavaScript disabled, English content, the full layout, screenshots, and disabled beta state remain visible.
- If a product image fails, meaningful alt text and the surrounding window label still explain the feature.
- If a configured public link is invalid, it remains hidden under the existing URL validation rules.
- Lazy images reserve their exact ratio so the page does not jump during loading.

## Verification

Implementation is complete only when all of the following pass:

1. `node --check site/site.js` and `site/site-config.js`.
2. `pnpm test:site`.
3. Full `pnpm test`, including asset verification.
4. Browser checks at desktop, tablet, and approximately 390px mobile widths.
5. English and Chinese hero copy, metadata, navigation, captions, and inspection labels switch correctly.
6. The first hero sentence is visibly larger and darker than the second sentence in English and Chinese, without exceeding 48px at the desktop maximum.
7. The Journey and Keepsakes screenshots have no rendered aspect ratio differing materially from `127:76`; the Atlas screenshot is not rendered.
8. No displayed screenshot is rotated, cropped, stretched, or overlapped.
9. No horizontal page overflow occurs at supported widths.
10. All images load and the browser console has no errors or warnings.
11. The signed-download action remains unavailable while `downloadEnabled` is `false`.

## Acceptance Summary

A visitor should first remember the Itsees logo and promise, then understand how the companion travels, and finally see credible evidence of the real desktop product. The finished page should feel like an authored travel journal, not a scrapbook of screenshots and not a generic software landing page.
