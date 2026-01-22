import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true // Index for faster searching
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        index: true
    },
    certificates: [{
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Template'
        },
        generatedAt: Date,
        downloadUrl: String
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Composite index for bulk checks
ParticipantSchema.index({ email: 1, category: 1 }, { unique: true });

export default mongoose.models.Participant || mongoose.model('Participant', ParticipantSchema);
