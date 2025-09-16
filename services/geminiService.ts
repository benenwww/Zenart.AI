import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SAFETY_FILTER_ERROR_MESSAGE = "This action failed. This can sometimes happen with low-quality, blurry, or unusual images that are misinterpreted by the safety system. Please try using the 'Clarify Image' tool first to improve the base image, then try this action again.";

const WATERMARK_INSTRUCTION = " As the final step, you MUST place a subtle watermark directly on top of the image content in the bottom-right corner. The watermark text is '@Zenart Ai'. Use a semi-transparent, 15pt cursive bold font. It is absolutely crucial that you DO NOT add borders, padding, or change the image's canvas size. The watermark must be an overlay on the existing pixels.";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

export const generatePromptFromImage = async (imageFile: File): Promise<string> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const textPart = {
            text: `Your task is to act as an expert prompt engineer for an AI image generator. Analyze the provided image with extreme attention to detail. Generate a single, comprehensive, and descriptive prompt that captures every critical element of the image.

Your generated prompt must include:
1.  **Subject(s):** Identify and count all characters or main subjects. Describe each one in detail, including:
    *   **Appearance:** Hair color (mention all colors and shades present, e.g., 'crimson red hair with black tips'), eye color, clothing style and colors, accessories, and any unique features.
    *   **Pose and Expression:** Describe their posture, actions, and facial expression.
    *   **Interaction:** If there are multiple subjects, describe how they are interacting with each other.
2.  **Setting/Background:** Describe the environment in meticulous detail.
3.  **Composition:** Describe the camera angle, framing (e.g., close-up, wide shot), and the arrangement of subjects.
4.  **Lighting:** Describe the quality and source of light (e.g., 'soft morning sunlight', 'dramatic neon glow').
5.  **Art Style:** Specify the artistic style (e.g., 'hyperrealistic digital painting', 'vintage anime style', 'photorealistic 8k').

**Crucial Rule:** Do NOT invent details. If a part of a subject is obscured or unclear, describe it as such (e.g., 'the lower body is hidden by foliage'). Do not guess what might be there. If you see an object you cannot identify, describe its shape and color instead of assigning it a name. This is critical to avoid hallucinations like inventing objects that are not in the image.

The final prompt should be a single, cohesive paragraph, rich with keywords that an AI image generator can effectively interpret. Do not generate a list, a fluent descriptive text. Ensure the prompt is safe for work.`
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
        });

        const text = response.text;
        if (text) {
          return text.trim();
        }
        
        // If we get here, text is missing. The request probably failed due to safety filters or another issue.
        console.error("Prompt generation failed: API response did not contain text.", JSON.stringify(response, null, 2));

        // Check for prompt-level blocking first. This happens before candidates are generated.
        if (response.promptFeedback?.blockReason) {
             console.error(`Prompt blocked. Reason: ${response.promptFeedback.blockReason}`);
             throw new Error(SAFETY_FILTER_ERROR_MESSAGE);
        }

        // Check for candidate-level blocking.
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason === 'PROHIBITED_CONTENT' || candidate?.finishReason === 'SAFETY') {
            console.error(`Candidate blocked. Reason: ${candidate.finishReason}`);
            throw new Error(SAFETY_FILTER_ERROR_MESSAGE);
        }

        // If no specific block reason is found, throw a generic error.
        throw new Error("The API returned an empty response. This may be due to a temporary issue or content filters.");

    } catch (error) {
        console.error("Error generating prompt from image:", error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const lowerCaseMessage = errorMessage.toLowerCase();

        if (lowerCaseMessage.includes("429") || lowerCaseMessage.includes("rate limit") || lowerCaseMessage.includes("resource_exhausted")) {
            throw new Error("You have exceeded your API quota. Please check your plan details or try again later.");
        }
        
        // Re-throw specific, informative errors from the try block so they are displayed to the user.
        if (error instanceof Error && (error.message.includes("API returned an empty response") || error.message === SAFETY_FILTER_ERROR_MESSAGE)) {
          throw error;
        }

        throw new Error("Failed to communicate with the Gemini API to generate a prompt.");
    }
};

const sanitizePrompt = async (prompt: string): Promise<string> => {
    try {
        const sanitizationInstruction = {
            text: `The following prompt for an AI image generator was rejected, likely due to safety filters. Please rephrase it to be more general and safe for work, while preserving the main subject and style. Remove any potentially ambiguous or sensitive keywords. Just return the new prompt, without any preamble. Original prompt: "${prompt}"`
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [sanitizationInstruction] },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error sanitizing prompt:", error);
        // If sanitization fails, just return the original prompt and let the next step fail.
        return prompt;
    }
};

const addWatermarkToImage = async (base64ImageData: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: 'image/jpeg', // The generation model outputs jpeg
            },
        };
        const textPart = {
            text: WATERMARK_INSTRUCTION, // Just the instruction, nothing else.
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const candidate = response.candidates?.[0];

        if (candidate?.finishReason === 'PROHIBITED_CONTENT' || candidate?.finishReason === 'SAFETY') {
            console.error("Watermarking failed due to safety filters. Returning original image.", JSON.stringify(response, null, 2));
            return base64ImageData;
        }

        const imageResponsePart = candidate?.content?.parts?.find(
            (part) => part.inlineData
        );

        const imageBytes = imageResponsePart?.inlineData?.data;

        if (imageBytes) {
            return imageBytes;
        } else {
            console.error("Watermarking step failed to return an image. Returning original image.", JSON.stringify(response, null, 2));
            return base64ImageData;
        }
    } catch (error) {
        console.error("Error adding watermark. Returning original image.", error);
        // If an error occurs, return the original non-watermarked image.
        // It's better to give the user a result than a complete failure.
        return base64ImageData;
    }
};

export const generateImageFromPrompt = async (prompt: string, aspectRatio: string, removeWatermark: boolean): Promise<string> => {
    try {
        // Step 1: Generate image without watermark
        let response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            },
        });
        
        // If the first attempt failed, sanitize and retry
        if (!response.generatedImages || response.generatedImages.length === 0) {
            console.warn("Initial image generation failed, likely due to safety filters. Attempting to sanitize prompt and retry.");
            const sanitizedPrompt = await sanitizePrompt(prompt);
            
            response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: sanitizedPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio,
                },
            });

            // If the second attempt also failed, throw error
            if (!response.generatedImages || response.generatedImages.length === 0) {
                 console.error("API response contained no images after retry:", JSON.stringify(response, null, 2));
                 throw new Error("Image generation failed, likely due to safety filters. Please modify the prompt and try again.");
            }
        }

        const initialImageBytes = response.generatedImages[0]?.image?.imageBytes;

        if (!initialImageBytes) {
            console.error("API response structure was unexpected:", JSON.stringify(response, null, 2));
            throw new Error("The API returned a response, but it did not contain valid image data.");
        }

        if (removeWatermark) {
            return initialImageBytes;
        }

        // Step 2: Add watermark to the generated image
        const watermarkedImageBytes = await addWatermarkToImage(initialImageBytes);
        return watermarkedImageBytes;

    } catch (error) {
        console.error("Error during image generation call:", error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const lowerCaseMessage = errorMessage.toLowerCase();

        if (lowerCaseMessage.includes("429") || lowerCaseMessage.includes("rate limit") || lowerCaseMessage.includes("resource_exhausted")) {
            throw new Error("You have exceeded your image generation quota. Please check your plan details or try again later.");
        }

        if (error instanceof Error && (error.message.includes("safety filters") || error.message.includes("valid image data"))) {
            throw error;
        }
        throw new Error("Failed to communicate with the Gemini API to generate an image.");
    }
};

export const enhanceImageQuality = async (imageFile: File, quality: '4k' | '8k', aspectRatio: string, removeWatermark: boolean): Promise<string> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const resolution = quality === '4k' 
            ? 'a photorealistic 4K resolution (3840x2160 pixels)' 
            : 'an ultra-detailed 8K resolution (7680x4320 pixels)';

        let promptText = `Take this image and upscale it to ${resolution}. IMPORTANT: The final output image MUST have an aspect ratio of exactly ${aspectRatio}. Intelligently crop, extend the scene, or add pillar/letterboxing if necessary to achieve this aspect ratio without distorting the main subject. After adjusting the aspect ratio, sharpen details, remove any compression artifacts, noise, or pixelation. Improve the overall lighting and color balance to make it look like a high-quality photograph or digital painting. Return only the improved image without any accompanying text.`;
        if (!removeWatermark) {
            promptText += WATERMARK_INSTRUCTION;
        }
        
        const textPart = { text: promptText };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const candidate = response.candidates?.[0];

        // Check for explicit failure reasons first.
        if (candidate?.finishReason === 'PROHIBITED_CONTENT' || candidate?.finishReason === 'SAFETY') {
            console.error("Image enhancement failed due to safety filters:", JSON.stringify(response, null, 2));
            throw new Error(SAFETY_FILTER_ERROR_MESSAGE);
        }

        // Find the image part in the response
        const imageResponsePart = candidate?.content?.parts?.find(
            (part) => part.inlineData
        );

        const imageBytes = imageResponsePart?.inlineData?.data;

        if (imageBytes) {
            return imageBytes;
        } else {
            // If we reach here, it means the request didn't fail due to an explicit safety block, but we still didn't get an image.
            console.error("API response did not contain an image part for enhancement:", JSON.stringify(response, null, 2));
             if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                throw new Error(`Image enhancement failed. The API responded with reason: ${candidate.finishReason}.`);
            }
            throw new Error("Image enhancement failed as the API did not return an image.");
        }
    } catch (error) {
        console.error("Error enhancing image:", error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const lowerCaseMessage = errorMessage.toLowerCase();

        if (lowerCaseMessage.includes("429") || lowerCaseMessage.includes("rate limit") || lowerCaseMessage.includes("resource_exhausted")) {
            throw new Error("You have exceeded your image enhancement quota. Please check your plan details or try again later.");
        }

        if (error instanceof Error && (
            error.message.includes("did not return an image") || 
            error.message.includes("safety filters") ||
            error.message.includes("prohibited content") ||
            error.message.includes("API responded with reason") ||
            error.message === SAFETY_FILTER_ERROR_MESSAGE
            )) {
            throw error;
        }

        throw new Error("Failed to communicate with the Gemini API to enhance the image.");
    }
};

export const fixImageLighting = async (imageFile: File, aspectRatio: string, removeWatermark: boolean): Promise<string> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        
        let promptText = `Analyze the provided image for lighting problems. Specifically, identify and correct any harsh glare, overexposed areas, or lens flares. Your main task is to reduce the intensity of blown-out highlights, recover lost details within these bright areas, and balance the overall exposure for a more natural and visually pleasing result. Preserve the original details, colors, and composition of the rest of the image. The final output image MUST have an aspect ratio of exactly ${aspectRatio}. Return only the corrected image.`;
        if (!removeWatermark) {
            promptText += WATERMARK_INSTRUCTION;
        }

        const textPart = { text: promptText };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const candidate = response.candidates?.[0];

        if (candidate?.finishReason === 'PROHIBITED_CONTENT' || candidate?.finishReason === 'SAFETY') {
            console.error("Lighting fix failed due to safety filters:", JSON.stringify(response, null, 2));
            throw new Error(SAFETY_FILTER_ERROR_MESSAGE);
        }

        const imageResponsePart = candidate?.content?.parts?.find((part) => part.inlineData);
        const imageBytes = imageResponsePart?.inlineData?.data;

        if (imageBytes) {
            return imageBytes;
        } else {
            console.error("API response did not contain an image part for lighting fix:", JSON.stringify(response, null, 2));
            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                throw new Error(`Lighting fix failed. The API responded with reason: ${candidate.finishReason}.`);
            }
            throw new Error("Lighting fix failed as the API did not return an image.");
        }
    } catch (error) {
        console.error("Error fixing image lighting:", error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const lowerCaseMessage = errorMessage.toLowerCase();

        if (lowerCaseMessage.includes("429") || lowerCaseMessage.includes("rate limit") || lowerCaseMessage.includes("resource_exhausted")) {
            throw new Error("You have exceeded your image processing quota. Please check your plan details or try again later.");
        }

        if (error instanceof Error && (
            error.message.includes("did not return an image") || 
            error.message.includes("safety filters") ||
            error.message.includes("prohibited content") ||
            error.message.includes("API responded with reason") ||
            error.message === SAFETY_FILTER_ERROR_MESSAGE
            )) {
            throw error;
        }

        throw new Error("Failed to communicate with the Gemini API to fix the image lighting.");
    }
};

export const clarifyImage = async (imageFile: File, aspectRatio: string, removeWatermark: boolean): Promise<string> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);

        let promptText = `Analyze the provided image for blurriness, pixelation, and compression artifacts. Your task is to gently sharpen the details, reduce noise, and clarify the main subjects without altering the original composition, colors, or content. The goal is to make a low-quality photo clearer. The final output image MUST have an aspect ratio of exactly ${aspectRatio}. Return only the clarified image.`;
        if (!removeWatermark) {
            promptText += WATERMARK_INSTRUCTION;
        }

        const textPart = { text: promptText };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const candidate = response.candidates?.[0];

        if (candidate?.finishReason === 'PROHIBITED_CONTENT' || candidate?.finishReason === 'SAFETY') {
            console.error("Image clarification failed due to safety filters:", JSON.stringify(response, null, 2));
            throw new Error(SAFETY_FILTER_ERROR_MESSAGE);
        }

        const imageResponsePart = candidate?.content?.parts?.find((part) => part.inlineData);
        const imageBytes = imageResponsePart?.inlineData?.data;

        if (imageBytes) {
            return imageBytes;
        } else {
            console.error("API response did not contain an image part for clarification:", JSON.stringify(response, null, 2));
            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                throw new Error(`Image clarification failed. The API responded with reason: ${candidate.finishReason}.`);
            }
            throw new Error("Image clarification failed as the API did not return an image.");
        }
    } catch (error) {
        console.error("Error clarifying image:", error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const lowerCaseMessage = errorMessage.toLowerCase();

        if (lowerCaseMessage.includes("429") || lowerCaseMessage.includes("rate limit") || lowerCaseMessage.includes("resource_exhausted")) {
            throw new Error("You have exceeded your image processing quota. Please check your plan details or try again later.");
        }

        if (error instanceof Error && (
            error.message.includes("did not return an image") || 
            error.message.includes("safety filters") ||
            error.message.includes("prohibited content") ||
            error.message.includes("API responded with reason") ||
            error.message === SAFETY_FILTER_ERROR_MESSAGE
            )) {
            throw error;
        }

        throw new Error("Failed to communicate with the Gemini API to clarify the image.");
    }
};


export const generateVideoFromImageAndPrompt = async (imageFile: File, prompt: string, aspectRatio: string, removeWatermark: boolean): Promise<string> => {
    const maxRetries = 3;
    let delay = 2000; // Start with a 2-second delay
    const imageBytes = await fileToBase64(imageFile); // Convert file once outside the loop

    let constructedPrompt = `Generate a high-definition, cinematic video based on the following description. The video should be of the highest possible quality. The final video's aspect ratio must be exactly ${aspectRatio}. Description: "${prompt}".`;
    if (!removeWatermark) {
        constructedPrompt += WATERMARK_INSTRUCTION;
    }

    let operation;

    // Retry loop for the initial video generation request
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: constructedPrompt,
                image: {
                    imageBytes: imageBytes,
                    mimeType: imageFile.type,
                },
                config: {
                    numberOfVideos: 1
                }
            });
            // If the request was successful, break out of the retry loop
            break;
        } catch (error) {
            console.error(`Error on initial video generation (Attempt ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            
            // Check for rate-limiting error signatures
            const isRateLimitError = errorMessage.includes("429") || 
                                     errorMessage.toLowerCase().includes("rate limit") || 
                                     errorMessage.toLowerCase().includes("resource_exhausted");

            if (isRateLimitError && attempt < maxRetries) {
                console.log(`Rate limit hit. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                if (isRateLimitError) {
                    // This was the last attempt, and it was a rate limit error.
                    console.error("Final attempt failed due to rate limit/quota.", error);
                    throw new Error("You've exceeded your video generation quota. Please check your plan and billing details, or try again later.");
                }
                // If it's not a rate limit error or we've exhausted retries for other reasons, throw the generic error.
                console.error("Final attempt failed or encountered a non-retriable error.", error);
                throw new Error("Failed to communicate with the Gemini API to generate a video.");
            }
        }
    }

    if (!operation) {
        // This will be true if all retry attempts failed.
        throw new Error("Failed to initiate video generation after multiple retries due to API errors.");
    }

    // Poll for completion, now with more resilience.
    while (!operation.done) {
        console.log('Polling for video generation status...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        try {
            operation = await ai.operations.getVideosOperation({ operation: operation });
        } catch (pollError) {
            // If polling fails, log it and the loop will automatically try again after 10s.
            console.warn(`A polling attempt failed: ${pollError}. Will continue polling.`);
        }
    }

    // Check for an error in the completed operation before proceeding.
    if (operation.done && operation.error) {
        const errorMessage = operation.error.message || 'The video generation operation failed with an unknown error.';
        console.error("Video generation operation failed:", JSON.stringify(operation.error, null, 2));
        throw new Error(errorMessage);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        console.error("Video generation operation completed but no download link found:", JSON.stringify(operation, null, 2));
        throw new Error("Video generation succeeded, but the result could not be retrieved.");
    }

    // The download link requires the API key. We fetch it here so the key is not exposed on the client.
    // We then create a blob URL for the client to use safely.
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download the generated video. Status: ${videoResponse.status}`);
    }
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);
};