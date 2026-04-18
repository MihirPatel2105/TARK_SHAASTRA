const axios = require('axios');

const DEFAULT_MODELS = [
    { name: 'garbage-model', department: 'Sanitation', version: 1 },
    { name: 'pothole-model', department: 'Roads', version: 1 },
    { name: 'water-model', department: 'Water', version: 1 },
    { name: 'electric-model', department: 'Electricity', version: 1 }
];

const DEFAULT_MIN_CONFIDENCE = 0.5;

function parseModelsConfig(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') {
        return DEFAULT_MODELS;
    }

    try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return DEFAULT_MODELS;
        }

        return parsed
            .filter((item) => item && typeof item.name === 'string' && typeof item.department === 'string')
            .map((item) => ({
                name: item.name.trim(),
                department: item.department.trim(),
                version: Number.isFinite(Number(item.version)) ? Number(item.version) : 1
            }))
            .filter((item) => item.name.length > 0 && item.department.length > 0);
    } catch (error) {
        return DEFAULT_MODELS;
    }
}

function getModels() {
    const configuredModels = parseModelsConfig(process.env.ROBOFLOW_MODELS);
    return configuredModels.length > 0 ? configuredModels : DEFAULT_MODELS;
}

function getMinConfidenceThreshold() {
    const parsed = Number(process.env.ROBOFLOW_MIN_CONFIDENCE);
    return Number.isFinite(parsed) ? parsed : DEFAULT_MIN_CONFIDENCE;
}

function toModelSummary(model, predictions, error = null) {
    const topPrediction = predictions.length > 0
        ? predictions.reduce((best, current) => (current.confidence > best.confidence ? current : best), predictions[0])
        : null;

    return {
        model: model.name,
        department: model.department,
        top_class: topPrediction ? topPrediction.class : null,
        top_confidence: topPrediction ? topPrediction.confidence : 0,
        prediction_count: predictions.length,
        error: error ? String(error.message || error) : null
    };
}

function getBestDepartment(results, minConfidence) {
    let best = {
        confidence: 0,
        department: 'General',
        label: null,
        model: null,
        decision: 'NO_PREDICTION'
    };

    for (const modelResult of results) {
        for (const prediction of modelResult.predictions) {
            if (prediction.confidence > best.confidence) {
                best = {
                    confidence: prediction.confidence,
                    department: modelResult.department,
                    label: prediction.class,
                    model: modelResult.model,
                    decision: 'AUTO_ASSIGNED'
                };
            }
        }
    }

    if (best.confidence === 0) {
        return best;
    }

    if (best.confidence < minConfidence) {
        return {
            ...best,
            department: 'Manual Selection Required',
            decision: 'LOW_CONFIDENCE'
        };
    }

    return best;
}

async function detectForModel(imageUrl, model, apiKey) {
    const endpoint = `https://detect.roboflow.com/${model.name}/${model.version}?api_key=${apiKey}`;
    const body = new URLSearchParams({ image: imageUrl }).toString();

    const response = await axios.post(endpoint, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
    });

    return Array.isArray(response.data?.predictions) ? response.data.predictions : [];
}

async function classifyImageByAllModels(imageUrl) {
    const apiKey = process.env.ROBOFLOW_API_KEY;
    if (!apiKey) {
        return {
            enabled: false,
            error: 'ROBOFLOW_API_KEY is not configured',
            best: {
                confidence: 0,
                department: 'General',
                label: null,
                model: null,
                decision: 'FAILED'
            },
            models: []
        };
    }

    const models = getModels();
    const minConfidence = getMinConfidenceThreshold();

    const settled = await Promise.allSettled(
        models.map(async (model) => {
            const predictions = await detectForModel(imageUrl, model, apiKey);
            return {
                model: model.name,
                department: model.department,
                predictions,
                summary: toModelSummary(model, predictions)
            };
        })
    );

    const successful = [];
    const modelSummaries = [];

    settled.forEach((result, index) => {
        const model = models[index];
        if (result.status === 'fulfilled') {
            successful.push(result.value);
            modelSummaries.push(result.value.summary);
            return;
        }

        modelSummaries.push(toModelSummary(model, [], result.reason));
    });

    const best = getBestDepartment(successful, minConfidence);

    return {
        enabled: true,
        threshold: minConfidence,
        best,
        models: modelSummaries
    };
}

module.exports = {
    classifyImageByAllModels
};
