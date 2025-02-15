/*
 * mydraft.cc
 *
 * @license
 * Copyright (c) Sebastian Stehle. All rights reserved.
*/

import { ConfigurableFactory, ConstraintFactory, DefaultAppearance, Rect2, RenderContext, ShapePlugin } from '@app/wireframes/interface';
import { CommonTheme } from './_theme';

const ACCENT_COLOR = 'ACCENT_COLOR';

const VALUE = 'VALUE';

const DEFAULT_APPEARANCE = {};
DEFAULT_APPEARANCE[DefaultAppearance.FOREGROUND_COLOR] = 0xffffff;
DEFAULT_APPEARANCE[DefaultAppearance.BACKGROUND_COLOR] = CommonTheme.CONTROL_BACKGROUND_COLOR;
DEFAULT_APPEARANCE[DefaultAppearance.FONT_SIZE] = CommonTheme.CONTROL_FONT_SIZE;
DEFAULT_APPEARANCE[DefaultAppearance.STROKE_COLOR] = CommonTheme.CONTROL_BORDER_COLOR;
DEFAULT_APPEARANCE[DefaultAppearance.STROKE_THICKNESS] = CommonTheme.CONTROL_BORDER_THICKNESS;
DEFAULT_APPEARANCE[DefaultAppearance.TEXT_DISABLED] = true;
DEFAULT_APPEARANCE[ACCENT_COLOR] = 0x2171b5;
DEFAULT_APPEARANCE[VALUE] = 50;

const HEIGHT_TOTAL = 16;

export class Progress implements ShapePlugin {
    public identifier(): string {
        return 'Progress';
    }

    public defaultAppearance() {
        return DEFAULT_APPEARANCE;
    }

    public defaultSize() {
        return { x: 150, y: HEIGHT_TOTAL };
    }

    public constraint(factory: ConstraintFactory) {
        return factory.size(undefined, HEIGHT_TOTAL);
    }

    public configurables(factory: ConfigurableFactory) {
        return [
            factory.slider(VALUE, 'Value', 0, 100),
            factory.color(ACCENT_COLOR, 'Accent Color'),
        ];
    }

    public render(ctx: RenderContext) {
        this.createBackground(ctx);
        this.createBorder(ctx);
    }

    private createBackground(ctx: RenderContext) {
        const relative = ctx.shape.getAppearance(VALUE) / 100;

        ctx.renderer2.group(items => {
            const activeBounds = new Rect2(ctx.rect.x, ctx.rect.y, ctx.rect.width * relative, ctx.rect.height);

            // Active area
            ctx.renderer2.rectangle(0, 0, activeBounds, p => {
                p.setBackgroundColor(ctx.shape.getAppearance(ACCENT_COLOR));
            });

            const inactiveBounds = new Rect2(ctx.rect.width * relative, ctx.rect.top, ctx.rect.width * (1 - relative), ctx.rect.height);

            // Inactive area.
            items.rectangle(0, 0, inactiveBounds, p => {
                p.setBackgroundColor(ctx.shape);
            });
        }, clip => {
            clip.rectangle(0, ctx.rect.height * 0.5, ctx.rect);
        });
    }

    private createBorder(ctx: RenderContext) {
        ctx.renderer2.rectangle(ctx.shape, ctx.rect.height * 0.5, ctx.rect, p => {
            p.setStrokeColor(ctx.shape);
        });
    }
}
