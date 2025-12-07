# Eye Tracking Face Generator

An interactive web experience where a face image follows your mouse cursor. The project uses AI-generated images with different eye positions and head tilts to create the illusion of a face tracking your cursor movement.

## Demo

Move your mouse around the screen and watch the face follow your cursor! The eyes and head will smoothly track your mouse position.

## How It Works

1. **Image Generation**: Uses the [fofr/expression-editor](https://replicate.com/fofr/expression-editor) model on Replicate to generate multiple variations of a face image with different:

    - `rotate_pitch` (-20 to 20): Head tilt up/down
    - `pupil_x` (-15 to 15): Horizontal eye position
    - `pupil_y` (-15 to 15): Vertical eye position

2. **Interactive Viewer**: An HTML page that:
    - Preloads all images on page load
    - Maps mouse cursor position to the closest matching image
    - Switches images smoothly to create the tracking effect

## Prerequisites

-   Node.js (v24 or higher)
-   A [Replicate](https://replicate.com) account and API token

## Setup

1. **Install dependencies**:

    ```bash
    npm install
    ```

2. **Create a `.env` file** in the project root with your Replicate API token:
    ```
    REPLICATE_API_TOKEN=your_api_token_here
    ```

## Usage

### Generate Images

To generate the face images with different expressions:

```bash
npm start
```

This will:

-   Generate 45 images (5 pitch values × 3 pupil_x values × 3 pupil_y values)
-   Save them to `./generated-images/`
-   Skip any images that already exist (useful for resuming after rate limits)
-   Create an `image-mappings.json` file with all parameter combinations

**Note**: The script includes rate limiting protection with automatic retries and delays between requests.

### Run the Web Server

To view the interactive face tracker:

```bash
npm run serve
```

Then open http://localhost:3000 in your browser.

## Customization

### Using Your Own Image

Edit `index.ts` and change the `IMAGE_URL` constant to your own image URL:

```typescript
const IMAGE_URL = "https://your-image-url.com/your-image.jpg";
```

### Adjusting Parameter Ranges

In `index.ts`, modify the parameter arrays in `generateParameterCombinations()`:

```typescript
const pitchValues = [-20, -10, 0, 10, 20]; // Head tilt values
const pupilXValues = [-15, 0, 15]; // Horizontal eye positions
const pupilYValues = [-15, 0, 15]; // Vertical eye positions
```

More values = smoother tracking but more images to generate.

### After Generating New Images

After generating new images, copy them to the viewer folder:

```bash
cp -r ./generated-images ./viewer/
```

Also update the parameter arrays in `viewer/index.html` to match your new values.

## Project Structure

```
├── index.ts              # Image generation script
├── package.json          # Project dependencies and scripts
├── .env                  # API token (not committed)
├── generated-images/     # Generated face images
│   ├── image_pitch0_px0_py0.webp
│   ├── image_pitch10_px-15_py15.webp
│   └── ...
└── viewer/
    ├── index.html        # Interactive web page
    └── generated-images/ # Copy of images for web server
```

## Scripts

| Command               | Description                                      |
| --------------------- | ------------------------------------------------ |
| `npm start`           | Generate face images using Replicate API         |
| `npm run serve`       | Start HTTP web server on port 3000               |
| `npm run serve:https` | Start HTTPS web server on port 3000 (for mobile) |

## Mobile Device Support (Motion Tracking)

The viewer supports device orientation sensors on mobile devices. When you tilt your phone, the face will follow!

### Setting Up HTTPS for Mobile Testing

Motion sensors require HTTPS to work on mobile browsers. To test on your phone:

1. **Generate SSL certificates** (self-signed):

    ```bash
    openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
    ```

2. **Start the HTTPS server**:

    ```bash
    npm run serve:https
    ```

3. **Find your local IP address**:

    ```bash
    # macOS
    ipconfig getifaddr en0

    # Linux
    hostname -I

    # Windows
    ipconfig
    ```

4. **On your mobile device**:
    - Connect to the same WiFi network as your computer
    - Open your browser and go to `https://YOUR_IP:3000`
    - Accept the security warning (self-signed certificate)
    - Tap "Enable Motion Tracking" button
    - Tilt your phone to control the face!

**Note**: The `cert.pem` and `key.pem` files are gitignored and need to be generated locally.

## API Parameters Reference

| Parameter      | Range     | Description                                                   |
| -------------- | --------- | ------------------------------------------------------------- |
| `rotate_pitch` | -20 to 20 | Head tilt (negative = look up, positive = look down)          |
| `pupil_x`      | -15 to 15 | Horizontal pupil position (negative = left, positive = right) |
| `pupil_y`      | -15 to 15 | Vertical pupil position (negative = down, positive = up)      |

## Troubleshooting

### Rate Limiting (429 Error)

If you hit rate limits while generating images:

-   The script will automatically retry with a 10-second delay
-   You can safely restart the script - it will skip already generated images
-   Consider increasing the delay between requests in `index.ts`

### Images Not Loading in Viewer

Make sure to copy the generated images to the viewer folder:

```bash
cp -r ./generated-images ./viewer/
```

## License

ISC
