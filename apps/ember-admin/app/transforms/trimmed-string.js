import Transform from '@ember-data/serializer/transform';

export default class TrimmedStringTransform extends Transform {
    deserialize(serialized) {
        // Always convert to null if the value is empty/null/undefined
        if (!serialized && serialized !== 0) {
            return null;
        }

        // Force to string and trim
        const trimmed = String(serialized).trim();
        
        // Convert empty strings or pure whitespace to null
        return trimmed || null;
    }

    serialize(deserialized) {
        // Always convert to null if the value is empty/null/undefined
        if (!deserialized && deserialized !== 0) {
            return null;
        }

        // Force to string and trim
        const trimmed = String(deserialized).trim();
        
        // Convert empty strings or pure whitespace to null
        return trimmed || null;
    }
}
