/**
 * Column Management Utility
 * Provides reusable column visibility and ordering management with localStorage persistence
 */

export interface ColumnConfig {
    id: string;
    label: string;
    visible: boolean;
    order: number;
    sortable?: boolean;
}

export interface ColumnManagerConfig {
    storageKey: string; // Unique key for localStorage (e.g., 'users-table-columns')
    defaultColumns: ColumnConfig[];
}

export class ColumnManager {
    private storageKey: string;
    private defaultColumns: ColumnConfig[];

    constructor(config: ColumnManagerConfig) {
        this.storageKey = config.storageKey;
        this.defaultColumns = config.defaultColumns;
    }

    /**
     * Load column configuration from localStorage or return defaults
     */
    loadColumns(): ColumnConfig[] {
        if (typeof window === 'undefined') {
            return this.defaultColumns;
        }

        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as ColumnConfig[];
                // Merge with defaults to handle new columns
                const defaultMap = new Map(this.defaultColumns.map(col => [col.id, col]));
                const storedMap = new Map(parsed.map(col => [col.id, col]));
                
                // Combine: use stored config if exists, otherwise use default
                const merged: ColumnConfig[] = [];
                const allIds = new Set([...defaultMap.keys(), ...storedMap.keys()]);
                
                for (const id of allIds) {
                    const storedCol = storedMap.get(id);
                    const defaultCol = defaultMap.get(id);
                    
                    if (storedCol) {
                        merged.push({ ...defaultCol, ...storedCol });
                    } else if (defaultCol) {
                        merged.push(defaultCol);
                    }
                }
                
                // Sort by order
                merged.sort((a, b) => a.order - b.order);
                return merged;
            }
        } catch (error) {
            console.error('Error loading column configuration:', error);
        }

        return this.defaultColumns;
    }

    /**
     * Save column configuration to localStorage
     */
    saveColumns(columns: ColumnConfig[]): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(columns));
        } catch (error) {
            console.error('Error saving column configuration:', error);
        }
    }

    /**
     * Toggle column visibility
     */
    toggleColumn(columns: ColumnConfig[], columnId: string): ColumnConfig[] {
        const updated = columns.map(col =>
            col.id === columnId ? { ...col, visible: !col.visible } : col
        );
        this.saveColumns(updated);
        return updated;
    }

    /**
     * Reorder columns
     */
    reorderColumns(columns: ColumnConfig[], fromIndex: number, toIndex: number): ColumnConfig[] {
        const updated = [...columns];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        
        // Update order values
        updated.forEach((col, index) => {
            col.order = index;
        });
        
        this.saveColumns(updated);
        return updated;
    }

    /**
     * Reset to default configuration
     */
    resetColumns(): ColumnConfig[] {
        this.saveColumns(this.defaultColumns);
        return [...this.defaultColumns];
    }

    /**
     * Get visible columns in order
     */
    getVisibleColumns(columns: ColumnConfig[]): ColumnConfig[] {
        return columns.filter(col => col.visible).sort((a, b) => a.order - b.order);
    }
}
