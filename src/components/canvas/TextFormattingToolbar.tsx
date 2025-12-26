import {
    Bold,
    Italic,
    Underline,
    List,
    Highlighter,
    Type,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Minus,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { ColorPanel } from './ColorPanel';

interface TextFormattingToolbarProps {
    onFormat: (command: string, value?: string) => void;
    currentFormat?: {
        bold: boolean;
        italic: boolean;
        underline: boolean;
        list: boolean;
        align: 'left' | 'center' | 'right';
    };
}

const COLORS = [
    '#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#FFFFFF'
];

export function TextFormattingToolbar({ onFormat }: TextFormattingToolbarProps) {
    const [textColor, setTextColor] = useState('#3B82F6');
    const [highlightColor, setHighlightColor] = useState('#EAB308');
    const [isTextColorOpen, setIsTextColorOpen] = useState(false);
    const savedSelectionRef = useRef<Range | null>(null);

    // Save selection when color picker opens
    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
        }
    };

    // Restore selection and apply color
    const restoreAndApplyColor = (command: string, value: string) => {
        const selection = window.getSelection();
        if (savedSelectionRef.current && selection) {
            selection.removeAllRanges();
            selection.addRange(savedSelectionRef.current);
        }
        document.execCommand(command, false, value);
    };

    // Disable canvas interactions when color picker is open to prevent keyboard hijacking
    useEffect(() => {
        const canvasElements = document.querySelectorAll('div[contenteditable="true"]');

        if (isTextColorOpen) {
            // Disable all contentEditable elements
            canvasElements.forEach(el => {
                (el as HTMLElement).style.pointerEvents = 'none';
                (el as HTMLElement).setAttribute('data-events-disabled', 'true');
            });
        } else {
            // Re-enable
            canvasElements.forEach(el => {
                if ((el as HTMLElement).getAttribute('data-events-disabled')) {
                    (el as HTMLElement).style.pointerEvents = '';
                    (el as HTMLElement).removeAttribute('data-events-disabled');
                }
            });
        }

        return () => {
            // Cleanup: re-enable on unmount
            canvasElements.forEach(el => {
                if ((el as HTMLElement).getAttribute('data-events-disabled')) {
                    (el as HTMLElement).style.pointerEvents = '';
                    (el as HTMLElement).removeAttribute('data-events-disabled');
                }
            });
        };
    }, [isTextColorOpen]);

    const handleAction = (e: React.MouseEvent, command: string, value?: string) => {
        e.preventDefault(); // Prevent focus loss
        if (command === 'foreColor' && value) {
            setTextColor(value);
        }
        if (command === 'hiliteColor' && value) {
            setHighlightColor(value);
        }
        onFormat(command, value);
    };

    return (
        <div className="flex items-center gap-0.5 p-1 bg-background border rounded-lg shadow-md mb-1 animate-in fade-in zoom-in-95 duration-200">

            {/* Font Size decrease/increase simulation (execCommand fontSize 1-7) */}
            <div className="flex items-center border-r pr-1 mr-1 space-x-0.5">
                <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onMouseDown={(e) => handleAction(e, 'decreaseFontSize')}
                    title="Decrease Size"
                >
                    <Minus className="h-3 w-3" />
                </Button>
                <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onMouseDown={(e) => handleAction(e, 'increaseFontSize')}
                    title="Increase Size"
                >
                    <Plus className="h-3 w-3" />
                </Button>
            </div>

            <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onMouseDown={(e) => handleAction(e, 'bold')}
                title="Bold (Ctrl+B)"
            >
                <Bold className="h-3 w-3" />
            </Button>

            <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onMouseDown={(e) => handleAction(e, 'italic')}
                title="Italic (Ctrl+I)"
            >
                <Italic className="h-3 w-3" />
            </Button>

            <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onMouseDown={(e) => handleAction(e, 'underline')}
                title="Underline (Ctrl+U)"
            >
                <Underline className="h-3 w-3" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onMouseDown={(e) => handleAction(e, 'insertUnorderedList')}
                title="Bullet List"
            >
                <List className="h-3 w-3" />
            </Button>

            {/* Text Color Picker - A with color underline */}
            <Popover open={isTextColorOpen} onOpenChange={setIsTextColorOpen} modal={false}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex flex-col items-center justify-center p-0.5"
                        onMouseDown={(e) => {
                            saveSelection();
                            e.preventDefault();
                        }}
                        title="Text Color"
                    >
                        <span className="text-xs font-bold leading-none">A</span>
                        <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: textColor }} />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-2"
                    align="start"
                    side="top"
                    sideOffset={10}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <ColorPanel
                        color={textColor}
                        onChange={(c) => setTextColor(c)}
                        onApply={(c) => restoreAndApplyColor('foreColor', c)}
                        onClose={() => setIsTextColorOpen(false)}
                    />
                </PopoverContent>
            </Popover>

            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()}>
                        <Highlighter className="h-3 w-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <div className="flex gap-1 flex-wrap w-[140px]">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: c }}
                                onMouseDown={(e) => handleAction(e, 'hiliteColor', c)}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

        </div>
    );
}
