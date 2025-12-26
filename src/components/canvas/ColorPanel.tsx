import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Button } from '@/components/ui/button';

interface ColorPanelProps {
    color: string;
    onChange: (color: string) => void;
    onApply?: (color: string) => void;
    onClose?: () => void;
}

const PRESET_COLORS = [
    '#000000', '#374151', '#ef4444', '#f97316', '#eab308',
    '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
    '#06b6d4', '#14b8a6', '#84cc16', '#f59e0b', '#dc2626', '#6366f1'
];

export function ColorPanel({ color, onChange, onApply, onClose }: ColorPanelProps) {
    return (
        <div
            className="space-y-2 p-1 color-panel-compact"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
                // Prevent ANY keyboard event from reaching canvas
                e.stopPropagation();
            }}
            onClick={(e) => {
                // Aggressive focus management to prevent canvas from stealing events
                e.stopPropagation();
            }}
        >
            {/* Color Wheel - smaller with compact circles */}
            <div onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <style>{`
                    .color-panel-compact .react-colorful__pointer {
                        width: 16px !important;
                        height: 16px !important;
                    }
                `}</style>
                <HexColorPicker color={color} onChange={onChange} style={{ width: '160px', height: '100px' }} />
            </div>

            {/* Hex Input - compact */}
            <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">#</span>
                <HexColorInput
                    color={color}
                    onChange={onChange}
                    onKeyDown={(e) => {
                        e.stopPropagation(); // Prevent parent contentEditable from capturing keystrokes
                        if (e.key === 'Enter') {
                            e.preventDefault(); // Prevent Enter from creating newline in contentEditable
                            if (onApply) onApply(color);
                            if (onClose) onClose();
                        }
                    }}
                    className="w-16 px-1.5 py-0.5 text-[10px] border rounded bg-background uppercase"
                    prefixed={false}
                />
                <div
                    className="w-5 h-5 rounded border border-border flex-shrink-0"
                    style={{ backgroundColor: color }}
                />
            </div>

            {/* Preset Colors - 2 rows of 8 */}
            <div className="border-t pt-1.5">
                <div className="grid grid-cols-8 gap-1">
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            className={`w-4 h-4 rounded border transition-transform hover:scale-110 ${color.toLowerCase() === c.toLowerCase() ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                                }`}
                            style={{ backgroundColor: c }}
                            onClick={() => onChange(c)}
                        />
                    ))}
                </div>
            </div>

            {/* Cancel / OK Buttons */}
            <div className="flex justify-end gap-1.5 pt-1 border-t">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button
                    size="sm"
                    className="h-6 px-3 text-xs"
                    onClick={() => {
                        if (onApply) onApply(color);
                        if (onClose) onClose();
                    }}
                >
                    OK
                </Button>
            </div>
        </div>
    );
}
