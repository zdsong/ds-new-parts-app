import React, { useEffect, useState } from 'react';
import Checkbox from '@mui/material/Checkbox';
import type { ICellRendererParams, IHeaderParams } from 'ag-grid-community';

import { choiceMarkSx } from '../styles/commonSX';

/** 一覧の選択列。フォームの複数選択と同じ印にする */
export const GridChoiceCheckbox = (params: ICellRendererParams) => {
    const [checked, setChecked] = useState(!!params.node.isSelected());

    useEffect(() => {
        const sync = () => setChecked(!!params.node.isSelected());
        params.node.addEventListener('rowSelected', sync);
        return () => params.node.removeEventListener('rowSelected', sync);
    }, [params.node]);

    return (
        <Checkbox
            size="small"
            sx={choiceMarkSx}
            checked={checked}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => params.node.setSelected(event.target.checked)}
        />
    );
};

/** 見出しの一括選択。ヘッダーは白地の文字なので、印も白にする */
const headerMarkSx = {
    ...choiceMarkSx,
    color: '#ffffff',
    '&.Mui-checked:not(.Mui-disabled), &.MuiCheckbox-indeterminate:not(.Mui-disabled)': {
        color: '#ffffff',
    },
};

export const GridChoiceHeader = (params: IHeaderParams) => {
    const [checked, setChecked] = useState(false);
    const [indeterminate, setIndeterminate] = useState(false);

    useEffect(() => {
        const sync = () => {
            let total = 0;
            let selected = 0;
            params.api.forEachNode((node) => {
                total += 1;
                if (node.isSelected()) selected += 1;
            });
            setChecked(total > 0 && selected === total);
            setIndeterminate(selected > 0 && selected < total);
        };
        sync();
        params.api.addEventListener('selectionChanged', sync);
        params.api.addEventListener('modelUpdated', sync);
        return () => {
            params.api.removeEventListener('selectionChanged', sync);
            params.api.removeEventListener('modelUpdated', sync);
        };
    }, [params.api]);

    return (
        <Checkbox
            size="small"
            sx={headerMarkSx}
            checked={checked}
            indeterminate={indeterminate}
            onChange={(event) => {
                const on = event.target.checked;
                params.api.forEachNode((node) => node.setSelected(on));
            }}
        />
    );
};
