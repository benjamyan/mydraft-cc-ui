/*
 * mydraft.cc
 *
 * @license
 * Copyright (c) Sebastian Stehle. All rights reserved.
*/

import * as React from 'react';
import * as svg from '@svgdotjs/svg.js';
import { Keys, sizeInPx } from '@app/core';
import { DefaultAppearance } from '@app/wireframes/interface';
import { Diagram, DiagramItem, Transform } from '@app/wireframes/model';
import { InteractionHandler, InteractionService, SvgEvent } from './interaction-service';

const MIN_WIDTH = 150;
const MIN_HEIGHT = 30;

export interface TextAdornerProps {
    // The current zoom value.
    zoom: number;

    // The selected diagram.
    selectedDiagram: Diagram;

    // The selected items.
    selectedItems: DiagramItem[];

    // The interaction service.
    interactionService: InteractionService;

    // A function to change the appearance of a visual.
    onChangeItemsAppearance: (diagram: Diagram, visuals: DiagramItem[], key: string, val: any) => any;


    transformAdorners: svg.Container;
}

// Publically accessible state for component actions and events
export interface TextAdornerState {
    // If our text area is being edited/visible
    active: boolean;
    // Our shape type for better error/event handling
    shapeType: DiagramItem["type"] | 'Label' | null;
    // The shape currently selected, or that is being edited
    selectedShape: DiagramItem | null;
}

export class TextAdorner extends React.PureComponent<TextAdornerProps, TextAdornerState> implements InteractionHandler {
    private readonly style = { display: 'none ' };
    // private selectedShape: DiagramItem | svg.Element | null = null;
    private textareaElement: HTMLTextAreaElement = null!;
    private shapeLabel: Element | undefined = null!;
    public state: TextAdornerState = null!;

    constructor(props: TextAdornerProps) {
        super(props);
        this.state = {
            active: false,
            shapeType: null,
            selectedShape: null
        }
    }

    public componentDidMount() {
        this.shapeLabel = 
            Array
                .from(this.props.transformAdorners.node.children)
                .find( (svg)=> svg.nodeName === 'text' );

        this.props.interactionService.addHandler(this);

        window.addEventListener('mousedown', this.handleMouseDown);
    }

    public componentWillUnmount() {
        this.props.interactionService.removeHandler(this);

        window.removeEventListener('mousedown', this.handleMouseDown);
    }

    public componentDidUpdate(prevProps: TextAdornerProps) {
        if (this.props.selectedItems !== prevProps.selectedItems) {
            this.updateText();
        }
    }

    private handleMouseDown = (e: MouseEvent) => {
        if (this.shapeLabel === e.target) {
            this.onLabelClick(e);
        } else if (e.target !== this.textareaElement) {
            if (this.state.active) {
                this.hide();
            }
        }
    };
    
    public onDoubleClick(event: SvgEvent) {
        if (event.shape && !event.shape.isLocked && this.textareaElement) {
            if (event.shape.textDisabled) {
                return;
            }
            
            this.setState({ 
                active: true,
                shapeType: event.shape.type,
                selectedShape: event.shape
            });
            this.show(event.shape.transform, event.shape.text);
            
            this.props.interactionService.hideAdorners();
        }
    }
    
    public onLabelClick(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.shapeLabel && this.props.selectedItems.length === 1) {
            // Only fire off if one item has been selected, otherwise ignore altogether
            this.setState({ 
                active: true,
                shapeType: 'Label',
                selectedShape: this.props.selectedItems[0]
            });
            this.show(
                (
                    this.props.selectedItems[0].type === 'Shape'
                        ? this.props.selectedItems[0].transform // Individual shapes have the `transform` prop publicly available and defined
                        : this.props.selectedItems[0].bounds(this.props.selectedDiagram) // Groups do not; fire the public fn to get its transform state
                ), 
                this.shapeLabel.innerHTML
            );
        }
    }

    private doInitialize = (textarea: HTMLTextAreaElement) => {
        this.textareaElement = textarea;
    };
    
    private doSubmit = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((Keys.isEnter(event) && !event.shiftKey) || Keys.isEscape(event)) {
            if (Keys.isEnter(event)) {
                this.updateText();
            } else {
                this.hide();
            }

            this.hide();

            event.preventDefault();
            event.stopPropagation();
        }
    };

    private updateText() {
        if (this.state.shapeType === null) {
            return;
        } else {
            const newText = this.textareaElement.value;
            let shape, 
                oldText;
            if (this.state.shapeType === 'Label') {
                // shape = this.state.selectedShape as svg.Element;
                // oldText = shape.node.innerHTML;
                // if (newText !== oldText) {
                //     shape.
                // }
            } else {
                // Handle update as a Shape/Group
                shape = this.state.selectedShape as DiagramItem;
                oldText = shape.text;
                if (newText !== oldText) {
                    this.props.onChangeItemsAppearance(this.props.selectedDiagram, [shape], DefaultAppearance.TEXT, newText);
                }
            }
            this.hide();
        }


        // if (this.state.shapeType === ('Shape' || 'Group')) {
        //     console.log(`-- updateText 2`);
        //     // is a diagram item
        //     const selectedShape = this.state.selectedShape as DiagramItem;
        //     const newText = this.textareaElement.value;
        //     const oldText = selectedShape.text;
    
        //     if (newText !== oldText) {
        //         this.props.onChangeItemsAppearance(this.props.selectedDiagram, [selectedShape], DefaultAppearance.TEXT, newText);
        //     }
    
        //     this.hide();
        // } else if (this.state.shapeType === 'Label') {
        //     // is a label item
        //     console.log(`-- updateText 3`);

        // } else {
        //     console.log(`-- updateText 4`);
        //     return;
        // }
    }
    
    private show(transform: Transform, inputText: string) {

        const zoom = this.props.zoom;

        let x, y, w, h;
        if (this.state.shapeType === 'Label') {
            // If were using a label, we add X amount to the input so its floating below the selected item
            x = sizeInPx(zoom * (transform.position.x - 0.5 * transform.size.x) - 4);
            y = sizeInPx(zoom * (transform.position.y - 0.5 * transform.size.y) + ((MIN_HEIGHT / 2) + transform.size.y));
            w = sizeInPx(zoom * (Math.max(transform.size.x, MIN_WIDTH)));
            // h = sizeInPx(zoom * (Math.max(transform.size.y, MIN_HEIGHT)) - 5);
            h = '25px';

            // Add these styles so the textarea for a label looks disticnt from a shape
            this.textareaElement.style.minHeight = 'unset';
            this.textareaElement.style.overflowY = 'hidden';
            this.textareaElement.style.fontSize = '12px';
            this.textareaElement.style.padding = '5px';
            this.textareaElement.style.lineHeight = '1';
            
        } else {
            // Handle a regular shape/group as it always has been
            x = sizeInPx(zoom * (transform.position.x - 0.5 * transform.size.x) - 2);
            y = sizeInPx(zoom * (transform.position.y - 0.5 * transform.size.y) - 2);
            w = sizeInPx(zoom * (Math.max(transform.size.x, MIN_WIDTH)) + 4);
            h = sizeInPx(zoom * (Math.max(transform.size.y, MIN_HEIGHT)) + 4);
        };
        
        this.textareaElement.value = inputText;
        this.textareaElement.style.top = y;
        this.textareaElement.style.left = x;
        this.textareaElement.style.width = w;
        this.textareaElement.style.height = h;
        this.textareaElement.style.resize = 'none';
        this.textareaElement.style.display = 'block';
        this.textareaElement.style.position = 'absolute';
        this.textareaElement.focus();
    }

    private hide() {
        
        this.setState({
            active: false,
            shapeType: null,
            selectedShape: null
        });

        this.textareaElement.style.width = '0';
        this.textareaElement.style.display = 'none';

        // remove properties if they exist
        this.textareaElement.style.removeProperty('min-height');
        this.textareaElement.style.removeProperty('overflow-y');
        this.textareaElement.style.removeProperty('font-size');
        this.textareaElement.style.removeProperty('padding');
        this.textareaElement.style.removeProperty('line-height');

        this.props.interactionService.showAdorners();
    }

    public render() {
        return (
            <textarea 
                className='ant-input no-border-radius' 
                style={this.style}
                ref={this.doInitialize}
                // onBlur={this.doHide}
                onKeyDown={this.doSubmit} 
            />
        );
    }
}
