import mongoose from 'mongoose';

const TemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: String,
    // Storing image as Base64 to keep it database-contained (Free tier friendly)
    // Warning: Max doc size 16MB. Restrict upload size in frontend.
    imageBase64: {
        type: String,
        required: true,
    },
    categories: [{
        type: String,
        required: true
    }],
    dimensions: {
        width: Number,
        height: Number
    },
    fields: [{
        id: String,
        type: { type: String, default: 'text' }, // text, date, etc.
        label: String,
        x: Number,
        y: Number,
        width: Number,
        fontSize: Number,
        fontFamily: String,
        color: String,
        align: String,
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

export default mongoose.models.Template || mongoose.model('Template', TemplateSchema);
