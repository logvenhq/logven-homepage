+++
title = "Brand"
description = "The Logven logo, colours and type, how to use them, and how to pair them with a partner's logo."
template = "brand.html"

[extra]
heading = "Brand guidelines"

shots = [
  { file = "stationery", label = "Stationery" },
  { file = "report", label = "Reports" },
  { file = "poster", label = "Posters" },
  { file = "notebook", label = "Notebooks" },
]

donts = [
  { kind = "recolour", text = "Change the logo’s colour." },
  { kind = "stretch", text = "Stretch or squash it." },
  { kind = "rotate", text = "Rotate or tilt it." },
  { kind = "effects", text = "Add gradients, shadows or effects." },
]

swatches = [
  { id = "ink", name = "Ink", hex = "#1d2027", rgb = "29 32 39", role = "Text, the logo", primary = true },
  { id = "paper", name = "Paper", hex = "#ffffff", rgb = "255 255 255", role = "Backgrounds", primary = true },
  { id = "blue", name = "Logven blue", hex = "#3458c6", rgb = "52 88 198", role = "Actions, focus, links", primary = true },
  { id = "wash", name = "Wash", hex = "#f7f7f9", rgb = "247 247 249", role = "Sections, footers" },
  { id = "mist", name = "Mist", hex = "#eeeff2", rgb = "238 239 242", role = "Wells, controls" },
  { id = "body", name = "Body", hex = "#545862", rgb = "84 88 98", role = "Running text" },
  { id = "muted", name = "Muted", hex = "#6b6e78", rgb = "107 110 120", role = "Secondary text" },
]

type_scale = [
  { role = "Display", size = "50", step = "display" },
  { role = "Section title", size = "42", step = "section" },
  { role = "Title", size = "28", step = "title" },
  { role = "Body", size = "17", step = "body" },
  { role = "Label", size = "15", step = "label" },
  { role = "Caption", size = "13", step = "caption" },
]

downloads = [
  { name = "Brand kit", text = "All logo files in SVG and PNG, in ink and white, with usage notes.", format = "ZIP", path = "brand/logven-brand-kit.zip" },
  { name = "Lockup", text = "The mark and wordmark, in ink, as a vector file.", format = "SVG", path = "brand/logven-lockup.svg" },
  { name = "Mark", text = "The mark on its own, in ink, as a vector file.", format = "SVG", path = "brand/logven-mark.svg" },
  { name = "Design tokens", text = "Colours, type, radii and motion as CSS custom properties.", format = "CSS", path = "brand/logven-tokens.css" },
]
+++
