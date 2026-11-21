# WetNote

**Since 2025** · [wetnote.com](https://www.wetnote.com)

My underwater software under one name: one brand, many modules, each a separate app with its
own stack.

## Amphora catalog

Amphora types are described across printed catalogs and separate online databases; this one
brings them into a single searchable typology. Live at
[wetnote.com/catalogue](https://wetnote.com/catalogue.html).

- Filter by rim, neck, handles, body and base, by date and region
- Photos, drawings, 3D models and silhouettes for each type
- A map of amphorae by period and country

|            |                                                     |
| ---------- | --------------------------------------------------- |
| Site       | HTML and JavaScript, with Bulma and Select2         |
| 3D and map | model-viewer for the 3D models, Leaflet for the map |
| Hosting    | Firebase Hosting                                    |

## Kaide

The first module, and the subject of my master's thesis. Upload a photo of an amphora, taken in
the field or underwater, and Kaide uses computer vision to return the most similar types from
the catalog of about 500, ranked by similarity score. Instead of matching a find by eye against
pages of catalogs, researchers get a fast first answer with less room for human error; the
thesis measures the difference. Status: in development; version 1 is due with the thesis in
early 2027.

| Planned   |                                                 |
| --------- | ----------------------------------------------- |
| Model     | Python and PyTorch, exported to ONNX            |
| Inference | ONNX Runtime Web, on the device, with no server |

More on the thesis: [education](../education.md).
