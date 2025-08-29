import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document } from 'mongoose';

export type FAQDocument = HydratedDocument<FAQ>;

@Schema({
    timestamps: true, // This automatically adds createdAt and updatedAt
    toObject: {
        transform: function (doc, ret) {
            delete ret.__v;
        }
    },
    toJSON: {
        transform: function (doc, ret) {
            delete ret.__v;
        }
    }
})
export class FAQ extends Document {

    @Prop({ required: true, trim: true })
    question: string;

    @Prop({ required: true, trim: true })
    answer: string;

    @Prop({ 
        type: [String], 
        default: [],
        validate: {
            validator: function(tags: string[]) {
                return tags.every(tag => typeof tag === 'string' && tag.trim().length > 0);
            },
            message: 'All tags must be non-empty strings'
        }
    })
    tags: string[];

    @Prop({ default: false })
    isActive: boolean;

    @Prop({ default: 0 })
    viewCount: number;

    @Prop({ default: 0 })
    helpfulCount: number;

    @Prop({ required: true })
    createdBy: string;

    @Prop()
    updatedBy: string;

    @Prop({ type: [String], default: [] })
    viewedBy: string[];

}

export const FAQSchema = SchemaFactory.createForClass(FAQ);

// Add text indexes for search functionality
FAQSchema.index({ 
    question: 'text', 
    answer: 'text', 
    tags: 'text' 
}, {
    weights: {
        question: 10,
        tags: 5,
        answer: 1
    },
    name: 'faq_text_index'
});

// Add other useful indexes
FAQSchema.index({ tags: 1 });
FAQSchema.index({ isActive: 1 });
FAQSchema.index({ createdAt: -1 });
FAQSchema.index({ viewCount: -1 });
FAQSchema.index({ helpfulCount: -1 });