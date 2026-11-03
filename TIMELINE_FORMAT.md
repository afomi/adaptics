# TimelineJS Data Format Reference

This document describes the JSON data format required for [Knight Lab's TimelineJS](https://timeline.knightlab.com).

## JSON Structure Overview

```json
{
  "title": { ... },      // Optional: Title slide
  "events": [ ... ],     // Required: Array of event slides
  "eras": [ ... ],       // Optional: Background era markers
  "scale": "human"       // Optional: "human" (default) or "cosmological"
}
```

## Slide Object (for title and events)

| Property | Required | Type | Description |
|----------|----------|------|-------------|
| `start_date` | Yes* | Date | Event start date (*not required for title slide) |
| `end_date` | No | Date | Event end date (creates a span) |
| `text` | No | Text | Headline and body text |
| `media` | No | Media | Image, video, or other media |
| `group` | No | String | Category name for grouping events |
| `display_date` | No | String | Custom date display (overrides formatted date) |
| `background` | No | Object | `{url, alt, color}` for slide background |
| `autolink` | No | Boolean | Auto-convert URLs to links (default: true) |
| `unique_id` | No | String | ID for URL hash bookmarks |

## Date Object

| Property | Required | Type | Description |
|----------|----------|------|-------------|
| `year` | Yes | Number | Year (negative for BCE) |
| `month` | No | Number | Month (1-12) |
| `day` | No | Number | Day of month |
| `hour` | No | Number | Hour (0-23) |
| `minute` | No | Number | Minute (0-59) |
| `second` | No | Number | Second (0-59) |
| `millisecond` | No | Number | Millisecond |
| `display_date` | No | String | Custom formatted date string |

## Text Object

| Property | Required | Type | Description |
|----------|----------|------|-------------|
| `headline` | No | String | Title text (supports HTML) |
| `text` | No | String | Body text (supports HTML) |

## Media Object

| Property | Required | Type | Description |
|----------|----------|------|-------------|
| `url` | Yes | String | Media URL or embed code |
| `caption` | No | String | Caption text |
| `credit` | No | String | Credit/attribution text |
| `thumbnail` | No | String | Thumbnail image URL |
| `alt` | No | String | Alt text for accessibility |
| `title` | No | String | Title attribute |
| `link` | No | String | URL to link the media to |
| `link_target` | No | String | Link target (e.g., "_blank") |

### Supported Media Types

TimelineJS supports many media sources including:
- Images (jpg, png, gif, etc.)
- YouTube, Vimeo, Dailymotion
- SoundCloud, Spotify
- Twitter, Instagram
- Google Maps
- Wikipedia
- Documents (PDF via Google Docs viewer)
- Iframe embeds

## Era Object

| Property | Required | Type | Description |
|----------|----------|------|-------------|
| `start_date` | Yes | Date | Era start date |
| `end_date` | Yes | Date | Era end date |
| `text` | No | Text | Era label |

## Complete Example

```json
{
  "title": {
    "text": {
      "headline": "History of Computing",
      "text": "<p>A timeline of major computing milestones.</p>"
    },
    "media": {
      "url": "https://example.com/computer.jpg",
      "caption": "The evolution of computers"
    }
  },
  "events": [
    {
      "start_date": {
        "year": 1943
      },
      "text": {
        "headline": "ENIAC",
        "text": "<p>The first general-purpose electronic computer.</p>"
      },
      "group": "Hardware"
    },
    {
      "start_date": {
        "year": 1969,
        "month": 10,
        "day": 29
      },
      "text": {
        "headline": "ARPANET First Message",
        "text": "<p>The first message sent over ARPANET, precursor to the Internet.</p>"
      },
      "group": "Networking",
      "media": {
        "url": "https://en.wikipedia.org/wiki/ARPANET",
        "caption": "Learn more on Wikipedia"
      }
    },
    {
      "start_date": {
        "year": 1991,
        "month": 8,
        "day": 6
      },
      "text": {
        "headline": "World Wide Web",
        "text": "<p>Tim Berners-Lee publishes the first website.</p>"
      },
      "group": "Networking"
    }
  ],
  "eras": [
    {
      "start_date": { "year": 1940 },
      "end_date": { "year": 1960 },
      "text": { "headline": "Early Computing" }
    },
    {
      "start_date": { "year": 1960 },
      "end_date": { "year": 1990 },
      "text": { "headline": "Mainframe Era" }
    },
    {
      "start_date": { "year": 1990 },
      "end_date": { "year": 2020 },
      "text": { "headline": "Personal Computing & Internet" }
    }
  ]
}
```

---

## Schema.org Alignment

TimelineJS data maps closely to [Schema.org/Event](https://schema.org/Event):

| TimelineJS | Schema.org/Event |
|------------|------------------|
| `start_date` | `startDate` |
| `end_date` | `endDate` |
| `text.headline` | `name` |
| `text.text` | `description` |
| `media.url` | `image` or `video` |
| `group` | `eventAttendanceMode` or custom property |
| `unique_id` | `identifier` |

### Schema.org Event Example

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "ARPANET First Message",
  "description": "The first message sent over ARPANET, precursor to the Internet.",
  "startDate": "1969-10-29",
  "image": "https://example.com/arpanet.jpg"
}
```

---

## LLM Prompt for Timeline Data Generation

Use the following prompt to generate TimelineJS-compatible data:

```
Generate timeline data in TimelineJS JSON format for the following topic: [YOUR TOPIC]

Requirements:
1. Return valid JSON matching the TimelineJS schema
2. Include a "title" object with headline and descriptive text
3. Include an "events" array with at least 5-10 chronological events
4. Each event MUST have:
   - start_date with at minimum a year (add month/day if known)
   - text with headline and descriptive text (HTML allowed)
5. Optionally include:
   - end_date for events spanning time periods
   - group to categorize related events
   - media with url, caption, and credit for images/videos
   - eras array for background period markers

Date format:
{
  "year": 2024,
  "month": 3,      // 1-12, optional
  "day": 15        // optional
}

Text format:
{
  "headline": "Event Title",
  "text": "<p>Description with <strong>HTML</strong> support.</p>"
}

Media format:
{
  "url": "https://example.com/image.jpg",
  "caption": "Image description",
  "credit": "Source attribution"
}

Return ONLY the JSON object, no markdown code blocks or explanation.
```

### Example Prompt Usage

```
Generate timeline data in TimelineJS JSON format for the following topic:
The history of artificial intelligence from 1950 to present day.

Requirements:
1. Return valid JSON matching the TimelineJS schema
...
```

---

## Converting Schema.org Events to TimelineJS

If you have data in Schema.org Event format, use this transformation:

```javascript
function schemaOrgToTimelineJS(schemaEvents) {
  return {
    events: schemaEvents.map(event => {
      const startDate = new Date(event.startDate);
      const result = {
        start_date: {
          year: startDate.getFullYear(),
          month: startDate.getMonth() + 1,
          day: startDate.getDate()
        },
        text: {
          headline: event.name,
          text: event.description
        }
      };

      if (event.endDate) {
        const endDate = new Date(event.endDate);
        result.end_date = {
          year: endDate.getFullYear(),
          month: endDate.getMonth() + 1,
          day: endDate.getDate()
        };
      }

      if (event.image) {
        result.media = {
          url: typeof event.image === 'string' ? event.image : event.image.url,
          caption: event.image.caption || '',
          credit: event.image.creditText || ''
        };
      }

      return result;
    })
  };
}
```

---

## Resources

- [TimelineJS Official Documentation](https://timeline.knightlab.com/docs/)
- [TimelineJS JSON Format Reference](https://timeline.knightlab.com/docs/json-format.html)
- [Schema.org Event](https://schema.org/Event)
- [TimelineJS GitHub Repository](https://github.com/NUKnightLab/TimelineJS3)
