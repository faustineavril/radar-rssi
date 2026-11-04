# Radar Book — 15 ans de radars RSSI (16 éditions, 2011 → 2026)

Module web autonome (HTML + CSS + JS natif, **aucune dépendance**), conçu pour être intégré dans une page wavestone.com.

| Fichier | Rôle |
|---|---|
| `radar-book.css` | Styles (tout est préfixé `.wrb`, aucun impact sur la page hôte) |
| `radar-book.js` | Comportement (~10 Ko non minifié) |
| `embed.html` | **Bloc à copier dans le CMS** |
| `index.html` | Page autonome (publiable telle quelle, ex. GitHub Pages) |
| `images/` | 16 radars extraits de `CISO_Radar_2011-2026.pptx` : `radar-AAAA.webp` (1800 px), `-900.webp` (mobile), `-hd.webp` (agrandissement) |

## 1. Origine des images

- 2011 → 2021, 2023, 2024, 2026 : rendu de la diapositive complète (LibreOffice, 240 dpi). Les polices propriétaires absentes du serveur de rendu ont été remplacées par des équivalents (Century Gothic → URW Gothic, Gotham Condensed Light → Sofia Sans Extra Condensed, Tahoma → Liberation Sans) : quelques retours à la ligne peuvent différer de PowerPoint, notamment en 2017 et 2018. **Pour une fidélité parfaite, exporter les diapositives depuis PowerPoint (Fichier › Exporter › PNG) et remplacer les fichiers.**
- 2022 et 2025 : image du radar embarquée dans le PPTX, utilisée telle quelle.
- 2023 : l'étiquette de travail « Final light version » a été retirée de la diapositive ; rien d'autre n'a été modifié.

## 1 bis. Remplacer un radar

Déposer le fichier dans `images/` puis mettre à jour le JSON `script.wrb-data` de `embed.html` :

```json
{ "year": 2014, "src": "images/radar-2014.webp", "width": 1600, "height": 1200,
  "alt": "Radar des priorités des RSSI, édition 2014",
  "srcset": "images/radar-2014-800.webp 800w, images/radar-2014.webp 1600w",
  "zoomSrc": "images/radar-2014-hd.png",
  "caption": "Optionnel : une phrase affichée sous l'année" }
```

- Les images ne sont **jamais recadrées ni retouchées** (`object-fit: contain`, aucun filtre). Le format de page s'adapte automatiquement aux proportions du 1er radar.
- `srcset` et `zoomSrc` sont facultatifs. Recommandé : WebP ~1600 px de large pour la page, PNG/HD pour l'agrandissement.
- Les années (2011 → 2025 dans la démo) viennent uniquement du JSON : ajuster `year` et le sur-titre si la période réelle diffère.

## 2. Intégrer

1. Charger `radar-book.css` dans le `<head>` et `radar-book.js` avec `defer`.
2. Coller le contenu de `embed.html` à l'endroit voulu.
3. Optionnel : `<link rel="preload" as="image" href="images/radar-2011.webp" fetchpriority="high">`.

**Point de vigilance CMS** : `position: sticky` ne fonctionne pas si un **ancêtre** du bloc a `overflow: hidden | auto | scroll` (fréquent sur les wrappers de sections). Le cas échéant, passer cet ancêtre en `overflow: visible` (ou `overflow: clip`). Si la page utilise une librairie de « smooth scroll » (Lenis, Locomotive…), l'exclure de ce bloc.

## 3. Comportement

- **Arrivée** : quand le module est visible à 55 %, les 4 premières pages se tournent automatiquement (2011 → 2015), puis le livre se referme sur 2011 et invite au scroll. Joué une fois par session ; toute interaction l'interrompt.
- **Scroll** : le module reste ancré. Un cran de molette = une page tournée (anti-inertie pour pavés tactiles). Sur mobile, le défilement tactile natif fait tourner les pages. Après le 15ᵉ radar, la page reprend son scroll normal ; en remontant, on refeuillette à rebours.
- **Commandes** : boutons précédent/suivant, frise chronologique cliquable (15 années), agrandissement plein écran (`<dialog>`, `Échap` pour fermer).
- **Clavier** : flèches ←/→/↑/↓, `Début`/`Fin`, `Entrée` sur le livre pour agrandir. Lien d'évitement « Passer la rétrospective ».
- **Accessibilité** : annonce `aria-live` de l'année à chaque changement, libellés explicites, focus visibles, cibles de 44 px.
- **`prefers-reduced-motion`** : pas d'autoplay, pas de rotation 3D (fondu de 240 ms).
- **Images** : seuls la page courante et ses voisines sont chargées ; le reste est préchargé en tâche de fond après le `load`.
- **Sans JavaScript** : les 15 radars s'affichent en liste simple.
- **Responsive** : double page (année à gauche, radar à droite) au-delà de 820 px de large ; page simple en dessous.

## 4. Personnalisation

Variables CSS sur `.wrb` : `--wrb-bg`, `--wrb-ink`, `--wrb-muted`, `--wrb-accent`, `--wrb-paper`, `--wrb-font` (hérite de la page par défaut), `--wrb-step` (distance de scroll par radar, 55svh desktop / 48svh mobile).

Options JSON (`options`) : `label`, `autoplayPages` (4), `autoplayOncePerSession` (true), `coverKicker`, `coverTitle`, `hint`, `pageRatio` (`"auto"` ou nombre largeur/hauteur).
