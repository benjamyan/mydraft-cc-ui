/*
 * mydraft.cc
 *
 * @license
 * Copyright (c) Sebastian Stehle. All rights reserved.
*/

import { ImmutableMap, Record, Rotation, Types, Vec2 } from '@app/core';
import { DefaultAppearance, Shape } from '@app/wireframes/interface';
import { Configurable } from './configurables';
import { Constraint } from './constraints';
import { Diagram } from './diagram';
import { DiagramContainer } from './diagram-container';
import { DiagramItemSet } from './diagram-item-set';
import { Transform } from './transform';

type Appearance = ImmutableMap<any>;

type ItemProps = {
    // The unique id for each item.
    id: string;

    // title of the shape/group
    title: string;

    // The locking state.
    isLocked?: boolean;

    // The type of the item.
    type: 'Shape' | 'Group';
};

type GroupProps = {
    // The child ids.
    childIds: DiagramContainer;

    // The cache for child values.
    childCache: object;

    // The rotation.
    rotation: Rotation;
};

type ShapeProps = {
    // The transformation..
    transform: Transform;

    // The configurable properties.
    configurables?: ReadonlyArray<Configurable>;

    // The transform constraints.
    constraint?: Constraint;

    // The id of the renderer.
    renderer: string;

    // Cachhe for the rendering process.
    renderCache: object;

    // The appearance.
    appearance: Appearance;
};

type Props = ItemProps & GroupProps & ShapeProps;

export class DiagramItem extends Record<Props> implements Shape {
    private cachedBounds: { [id: string]: Transform } | undefined = {};

    public get id() {
        return this.get('id');
    }

    public get type() {
        return this.get('type');
    }

    public get appearance() {
        return this.get('appearance');
    }

    public get childIds() {
        return this.get('childIds');
    }

    public get configurables() {
        return this.get('configurables');
    }

    public get constraint() {
        return this.get('constraint');
    }

    public get isLocked() {
        return this.get('isLocked');
    }

    public get rotation() {
        return this.get('rotation');
    }

    public get renderCache() {
        return this.get('renderCache');
    }

    public get renderer() {
        return this.get('renderer');
    }

    public get transform() {
        return this.get('transform');
    }

    public get fontSize(): number {
        return this.getAppearance(DefaultAppearance.FONT_SIZE) || 10;
    }

    public get fontFamily(): string {
        return this.getAppearance(DefaultAppearance.FONT_FAMILY) || 'inherit';
    }

    public get backgroundColor(): string {
        return this.getAppearance(DefaultAppearance.BACKGROUND_COLOR);
    }

    public get foregroundColor(): string {
        return this.getAppearance(DefaultAppearance.FOREGROUND_COLOR);
    }

    public get iconFontFamily(): string {
        return this.getAppearance(DefaultAppearance.ICON_FONT_FAMILY);
    }

    public get link(): string {
        return this.getAppearance(DefaultAppearance.LINK);
    }

    public get opacity(): number {
        return this.getAppearance(DefaultAppearance.OPACITY);
    }

    public get strokeColor(): string {
        return this.getAppearance(DefaultAppearance.STROKE_COLOR);
    }

    public get strokeThickness(): number {
        return this.getAppearance(DefaultAppearance.STROKE_THICKNESS);
    }

    public get text(): string {
        return this.getAppearance(DefaultAppearance.TEXT);
    }

    public get textAlignment(): string {
        return this.getAppearance(DefaultAppearance.TEXT_ALIGNMENT);
    }

    public get textDisabled(): boolean {
        return this.getAppearance(DefaultAppearance.TEXT_DISABLED);
    }

    public getAppearance(key: string) {
        return this.appearance.get(key);
    }

    public static createGroup(id: string, ids: DiagramContainer | ReadonlyArray<string>,
        rotation?: Rotation | null,
    ) {
        const childIds = getChildIds(ids);

        const props: GroupProps & ItemProps = {
            id,
            childCache: {},
            childIds,
            title: 'Group #', // BJY TODO
            type: 'Group',
            rotation: rotation || Rotation.ZERO,
        };

        return new DiagramItem(props as any);
    }

    public static createShape(id: string, renderer: string, w: number, h: number,
        visual?: Appearance | { [key: string]: any },
        configurables?: Configurable[],
        constraint?: Constraint,
    ) {
        const props: ShapeProps & ItemProps = {
            id,
            appearance: getAppearance(visual),
            configurables,
            constraint,
            renderCache: {},
            renderer,
            title: renderer, // BJY TODO
            transform: createTransform(w, h),
            type: 'Shape',
        };

        return new DiagramItem(props as any);
    }

    public lock() {
        return this.set('isLocked', true);
    }

    public unlock() {
        return this.set('isLocked', undefined);
    }

    public replaceAppearance(appearance: Appearance) {
        if (this.type === 'Group' || !appearance) {
            return this;
        }

        return this.set('appearance', appearance);
    }

    public setAppearance(key: string, value: any) {
        if (this.type === 'Group') {
            return this;
        }

        const appearance = this.appearance.set(key, value);

        return this.set('appearance', appearance);
    }

    public unsetAppearance(key: string) {
        if (this.type === 'Group') {
            return this;
        }

        const appearance = this.appearance.remove(key);

        return this.set('appearance', appearance);
    }

    public transformWith(transformer: (t: Transform) => Transform) {
        if (this.type === 'Group' || !transformer) {
            return this;
        }

        const newTransform = transformer(this.transform);

        return this.transformTo(newTransform);
    }

    public transformTo(transform: Transform) {
        if (this.type === 'Group' || !transform) {
            return this;
        }

        return this.set('transform', transform);
    }

    public bounds(diagram: Diagram): Transform {
        if (this.type === 'Group') {
            this.cachedBounds ||= {};
        
            let cacheId = diagram.instanceId;
            let cached = this.cachedBounds[cacheId];

            if (!cached) {
                const set = DiagramItemSet.createFromDiagram([this.id], diagram);

                if (!set || set.allItems.length === 0) {
                    return Transform.ZERO;
                }

                const transforms = set.allVisuals.filter(x => x.type === 'Shape').map(x => x.transform);

                this.cachedBounds[cacheId] = cached = Transform.createFromTransformationsAndRotation(transforms, this.rotation);
            }

            return cached;
        } else {
            return this.transform;
        }
    }

    // BJY 
    public get title() {
        return this.get('title');
    }
    // BJY 
    public setTitle(title: string) {
        console.log('setTitle');
        console.log(title);
    }

    public transformByBounds(oldBounds: Transform, newBounds: Transform) {
        if (!oldBounds || !newBounds || oldBounds.equals(newBounds)) {
            return this;
        }

        if (this.type === 'Group') {
            const rotation = this.rotation.add(newBounds.rotation).sub(oldBounds.rotation);

            return this.set('rotation', rotation);
        } else {
            const transform = this.transform.transformByBounds(oldBounds, newBounds, undefined);

            return this.transformTo(transform);
        }
    }

    protected afterClone(values: ImmutableMap<any>, prev?: DiagramItem) {
        if (this.constraint) {
            const size = this.constraint.updateSize(this, this.transform.size, prev);

            if (size.x > 0 && size.y > 0) {
                return values.set('transform', this.transform.resizeTopLeft(size));
            }
        }

        return values;
    }
}

function getAppearance(visual: Appearance | { [key: string]: any } | undefined): Appearance {
    if (Types.isObject(visual)) {
        return ImmutableMap.of(<any>visual);
    }

    return visual || ImmutableMap.empty();
}

function getChildIds(childIds: DiagramContainer | ReadonlyArray<string> | undefined): DiagramContainer {
    if (Types.isArray(childIds)) {
        return DiagramContainer.of(...childIds);
    }

    return childIds || new DiagramContainer([]);
}

function createTransform(w: number, h: number): Transform {
    return new Transform(Vec2.ZERO, new Vec2(w, h), Rotation.ZERO);
}
