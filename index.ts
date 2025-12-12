import Replicate from "replicate";
import fs from "node:fs";
import path from "node:path";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Configuration
const IMAGE_URL = "https://res.cloudinary.com/suv4o/image/upload/v1764988409/images/IMG_3766_qxd02c.jpg";
const OUTPUT_DIR = "./generated-images";

interface ImageParams {
    rotate_pitch: number;
    pupil_x: number;
    pupil_y: number;
}

function generateParameterCombinations(): ImageParams[] {
    const combinations: ImageParams[] = [];

    // Dense grid for smooth tracking (~315 images)
    // - 9 values for rotate_pitch: -20, -15, -10, -5, 0, 5, 10, 15, 20
    // - 7 values for pupil_x: -15, -10, -5, 0, 5, 10, 15
    // - 5 values for pupil_y: -15, -7, 0, 7, 15
    const pitchValues = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
    const pupilXValues = [-15, -10, -5, 0, 5, 10, 15];
    const pupilYValues = [-15, -7, 0, 7, 15];

    // Generate combinations (9 * 7 * 5 = 315 images, but we'll skip existing ones)
    for (const pitch of pitchValues) {
        for (const pupilX of pupilXValues) {
            for (const pupilY of pupilYValues) {
                combinations.push({
                    rotate_pitch: pitch,
                    pupil_x: pupilX,
                    pupil_y: pupilY,
                });
            }
        }
    }

    return combinations;
}

function getFilename(params: ImageParams): string {
    return `image_pitch${params.rotate_pitch}_px${params.pupil_x}_py${params.pupil_y}.webp`;
}

function getExistingImages(): Set<string> {
    const existing = new Set<string>();
    if (fs.existsSync(OUTPUT_DIR)) {
        const files = fs.readdirSync(OUTPUT_DIR);
        files.forEach((file) => existing.add(file));
    }
    return existing;
}

async function generateImage(params: ImageParams, index: number, total: number): Promise<void> {
    console.log(
        `Generating image ${index + 1}/${total}: pitch=${params.rotate_pitch}, pupil_x=${params.pupil_x}, pupil_y=${
            params.pupil_y
        }`
    );

    try {
        const output = await replicate.run(
            "fofr/expression-editor:bf913bc90e1c44ba288ba3942a538693b72e8cc7df576f3beebe56adc0a92b86",
            {
                input: {
                    aaa: 0,
                    eee: 0,
                    woo: 0,
                    wink: 0,
                    blink: 0,
                    image: IMAGE_URL,
                    smile: 0,
                    eyebrow: 0,
                    pupil_x: params.pupil_x,
                    pupil_y: params.pupil_y,
                    src_ratio: 1,
                    rotate_yaw: 0,
                    crop_factor: 2.5,
                    rotate_roll: 0,
                    rotate_pitch: params.rotate_pitch,
                    sample_ratio: 1,
                    output_format: "webp",
                    output_quality: 95,
                },
            }
        );

        // Get the file URL and download the image
        const outputArray = output as any[];
        if (outputArray && outputArray.length > 0) {
            const imageUrl = outputArray[0].url();
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const filename = getFilename(params);
            const filepath = path.join(OUTPUT_DIR, filename);

            fs.writeFileSync(filepath, buffer);
            console.log(`  ✓ Saved: ${filename}`);
        }
    } catch (error) {
        console.error(`  ✗ Error generating image ${index + 1}:`, error);
        throw error; // Re-throw to handle retry logic
    }
}

async function main() {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get existing images
    const existingImages = getExistingImages();
    console.log(`Found ${existingImages.size} existing images in ${OUTPUT_DIR}/`);

    // Generate all combinations and filter out existing ones
    const allCombinations = generateParameterCombinations();
    const missingCombinations = allCombinations.filter((params) => !existingImages.has(getFilename(params)));

    console.log(`Total combinations: ${allCombinations.length}`);
    console.log(`Missing images to generate: ${missingCombinations.length}\n`);

    if (missingCombinations.length === 0) {
        console.log("✓ All images already generated!");
    } else {
        // Generate missing images sequentially with longer delay to avoid rate limiting
        for (let i = 0; i < missingCombinations.length; i++) {
            let retries = 3;
            while (retries > 0) {
                try {
                    await generateImage(missingCombinations[i], i, missingCombinations.length);
                    break; // Success, exit retry loop
                } catch (error: any) {
                    retries--;
                    if (error?.response?.status === 429 || error?.message?.includes("429")) {
                        const waitTime = 10000; // Wait 10 seconds on rate limit
                        console.log(
                            `  ⏳ Rate limited. Waiting ${waitTime / 1000}s before retry... (${retries} retries left)`
                        );
                        await new Promise((resolve) => setTimeout(resolve, waitTime));
                    } else if (retries === 0) {
                        console.error(`  ✗ Failed after 3 attempts, skipping...`);
                    }
                }
            }

            // Add delay between requests to avoid rate limiting (3 seconds)
            if (i < missingCombinations.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }

        console.log(`\n✓ Done!`);
    }

    // Generate/update the JSON file with all parameter mappings
    const mappings = allCombinations.map((params) => ({
        filename: getFilename(params),
        ...params,
    }));

    fs.writeFileSync(path.join(OUTPUT_DIR, "image-mappings.json"), JSON.stringify(mappings, null, 2));
    console.log("✓ Updated image-mappings.json");
}

main().catch(console.error);
