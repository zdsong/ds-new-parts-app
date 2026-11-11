import React, { useState, useCallback, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { TextField, IconButton, Box, Popover, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { parse, format as dateFnsFormat, isValid } from 'date-fns';
import { SelectChangeEvent } from '@mui/material/Select';
import { useInput } from 'react-admin';

interface CustomDateInputProps {
    inputRef?: React.Ref<HTMLInputElement>;
    sx?: { input?: React.CSSProperties };
    helperText?: React.ReactNode | boolean;
    source: string;
    label?: string;
    validate?: any;
    disabled?: boolean;
    readOnly?: boolean;
    defaultValue?: string;
    onBlur?: (
        e: React.ChangeEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
        value: string,
        originalEvent?: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void;
    slotProps?: any;
    dateFormat?: string;
    yearRange?: [number, number];
    value?: any;
}

export interface CustomDateInputHandle {
  clear: () => void;
  focus: () => void;
}

const CustomDateInput = forwardRef<CustomDateInputHandle, CustomDateInputProps>(
  (props, ref) => {
    const {
        inputRef,
        sx,
        helperText = false,
        source,
        value: propsValue,
        label = '',
        validate,
        disabled = false,
        readOnly = false,
        defaultValue,
        slotProps = {},
        dateFormat = 'yyyy/MM/dd',
        yearRange = [new Date().getFullYear() - 30, new Date().getFullYear() + 100]
    } = props;

    const [oldDate, setOldDate] = useState<any>('')

    const formatAndValidateDate = (inputStr: string): string | false => {
        if (!inputStr.trim()) return false;

        try {
            let normalizedStr = inputStr.trim();
            
            const eightDigitReg = /^\d{8}$/;
            if (eightDigitReg.test(normalizedStr)) {
                const year = normalizedStr.substring(0, 4);
                const month = normalizedStr.substring(4, 6);
                const day = normalizedStr.substring(6, 8);
                normalizedStr = `${year}/${month}/${day}`;
            } 
            else {
                normalizedStr = normalizedStr.replace(/[-.,]/g, '/');
            }

            const parsedDate = parse(normalizedStr, dateFormat, new Date());
            if (isValid(parsedDate)) {
                return formatDateToString(parsedDate);
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    };

    const inputTextRef = useRef(null);

    const clear = useCallback(() => {
      setInputValue('');
      setOldDate('');
      const now = new Date();
      setDisplayYear(now.getFullYear());
      setDisplayMonth(now.getMonth());
      if (props.onBlur) {
        props.onBlur(
            { 
                target: { 
                    name: source,
                    value: '' 
                } 
            } as React.ChangeEvent<HTMLInputElement>,
            '',
        );
      }
    }, []);

    const focus = useCallback(() => {
      const inputEl = (inputTextRef.current as any).querySelector('input');
      if (inputEl) inputEl.focus();
    }, []);


    useImperativeHandle(ref, () => ({
      clear,
      focus,
    }));

    const {
        field: { name, value, onChange, onBlur },
    } = useInput(props);

      
    const [inputValue, setInputValue] = useState<string>(
        value || defaultValue || ''
    );

    const handleSelectToday = () => {
      handleDateSelect(new Date());
    };

    const handleClearDate = () => {
      handleDateSelect(null);
    };

    const parseStringToDate = useCallback((str: string) => {
        if (!str) return null;
        const parsedDate = parse(str, dateFormat, new Date());
        return isValid(parsedDate) ? parsedDate : null;
    }, [dateFormat]);

    const [popoverAnchor, setPopoverAnchor] = useState<HTMLButtonElement | null>(null);

    const [displayYear, setDisplayYear] = useState<number>(
      parseStringToDate(inputValue)?.getFullYear() || new Date().getFullYear()
    );

    const [displayMonth, setDisplayMonth] = useState<number>(
      parseStringToDate(inputValue)?.getMonth() || new Date().getMonth()
    );

    const formatDateToString = useCallback((date: Date | null) => {
      if (!date || !isValid(date)) return '';
      return dateFnsFormat(date, dateFormat);
    }, [dateFormat]);

    useEffect(() => {
        if (value !== undefined && value !== inputValue) {
          setInputValue(value || '');
          const parsedDate = parseStringToDate(value || '');
          if (parsedDate) {
            setDisplayYear(parsedDate.getFullYear());
            setDisplayMonth(parsedDate.getMonth());
          }
        }
    }, [value, dateFormat]);
    

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        const formatDate1 = formatAndValidateDate(newValue)
        const parsedDate = parseStringToDate(formatDate1 || '');
        if (parsedDate) {
          setDisplayYear(parsedDate.getFullYear());
          setDisplayMonth(parsedDate.getMonth());
        }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const rawValue = target.value;
        const trimmedValue = rawValue.trim();
        if(!trimmedValue) {
          if (props.onBlur) {
              props.onBlur(
                  { 
                      target: { 
                          name: source,
                          value: '' 
                      } 
                  } as React.ChangeEvent<HTMLInputElement>,
                  '',
                  e,
              );
          }
          setOldDate('')
          return
        }
        const formattedValue = formatAndValidateDate(trimmedValue);
        
        if (formattedValue) {
            setInputValue(formattedValue);
            const parsedDate = parseStringToDate(formattedValue);
            if (parsedDate) {
                setDisplayYear(parsedDate.getFullYear());
                setDisplayMonth(parsedDate.getMonth());
            }
            if (onBlur) {onBlur(e);}
            if (props.onBlur) {
                props.onBlur(
                    { 
                        target: { 
                            name: source,
                            value: formattedValue 
                        } 
                    } as React.ChangeEvent<HTMLInputElement>,
                    formattedValue,
                    e,
                );
            }
            setOldDate(formattedValue)
        }else{
            setInputValue(oldDate)
            if (props.onBlur) {
                props.onBlur(
                    { 
                        target: { 
                            name: source,
                            value: oldDate || '' 
                        } 
                    } as React.ChangeEvent<HTMLInputElement>,
                    oldDate,
                    e,
                );
            }
        }
    };

    const handleDateSelect = (date: Date | null) => {
        const newStrValue = formatDateToString(date);
        setInputValue(newStrValue);

        if (props.onBlur) {
            props.onBlur(
                { 
                    target: { 
                        name: source, 
                        value: newStrValue 
                    } 
                } as React.ChangeEvent<HTMLInputElement>,
                newStrValue,
            );
        }
        setPopoverAnchor(null);
        
    };

    const handlePopoverOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || readOnly) return;
      setPopoverAnchor(e.currentTarget);
      const parsedDate = parseStringToDate(inputValue);
      if (parsedDate) {
        setDisplayYear(parsedDate.getFullYear());
        setDisplayMonth(parsedDate.getMonth());
      }
    };
    const handlePopoverClose = () => setPopoverAnchor(null);

    const prevMonth = () => {
      if (displayMonth === 0) {
        setDisplayYear(displayYear - 1);
        setDisplayMonth(11);
      } else {
        setDisplayMonth(displayMonth - 1);
      }
    };

    const nextMonth = () => {
      if (displayMonth === 11) {
        setDisplayYear(displayYear + 1);
        setDisplayMonth(0);
      } else {
        setDisplayMonth(displayMonth + 1);
      }
    };

    const handleYearChange = (e: SelectChangeEvent<number>, child: React.ReactNode) => {
        const newYear = e.target.value;
        if (newYear >= yearRange[0] && newYear <= yearRange[1]) {
        setDisplayYear(newYear);
        }
    };

    const renderDatePicker = () => {
      const currentDate = parseStringToDate(inputValue) || new Date();
      const year = displayYear;
      const month = displayMonth;

      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dateCells = [];
      for (let i = 0; i < firstDayOfMonth; i++) {
        dateCells.push(<div key={`empty-${i}`} style={{ height: 30, textAlign: 'center' }} />);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
        const isSelected = day === currentDate.getDate() && month === currentDate.getMonth() && year === currentDate.getFullYear();
        dateCells.push(
          <div
            key={`day-${day}`}
            style={{
              height: 25,
              textAlign: 'center',
              lineHeight: '30px',
              cursor: 'pointer',
              backgroundColor: isSelected ? '#1976d2' : isToday ? '#e3f2fd' : 'transparent',
              color: isSelected ? 'white' : 'inherit',
              borderRadius: 4,
              fontSize: '13px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => {
              if (isSelected) e.currentTarget.style.backgroundColor = '#1976d2';
              else if (isToday) e.currentTarget.style.backgroundColor = '#e3f2fd';
              else e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onClick={() => handleDateSelect(new Date(year, month, day))}
          >
            {day}
          </div>
        );
      }

      const yearOptions = [];
      for (let y = yearRange[0]; y <= yearRange[1]; y++) {
        yearOptions.push(
          <MenuItem key={`year-${y}`} value={y}>
            {y}年
          </MenuItem>
        );
      }

      const japaneseWeekdays = ['日', '月', '火', '水', '木', '金', '土'];

      return (
        <Box sx={{ width: 213, padding: '8px 12px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.3 }}>
          <IconButton size="small" onClick={prevMonth} sx={{ padding: 0 }}>◀</IconButton>
          <FormControl size="small" sx={{ minWidth: 67, mr: 0.7 }}>
            <Select
              value={year}
              onChange={handleYearChange}
              displayEmpty
              disabled={disabled}
              sx={{
                height: '30px',
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }
                }
              }}
            >
              {yearOptions}
            </Select>
          </FormControl>
          <span style={{ fontSize: '0.875rem' }}>{month + 1}月</span> 
          <IconButton size="small" onClick={nextMonth} sx={{ padding: 0 }}>▶</IconButton>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.7 }}>
          {japaneseWeekdays.map(day => (
            <div key={day} style={{ textAlign: 'center', fontSize: 12, color: '#666' }}>{day}</div> 
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}> {/* gap 1 → 0.7（1/3に縮小） */}
          {dateCells}
        </Box>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            mt: 1, 
            borderTop: '1px solid #eee', 
            paddingTop: 1 
          }}
        >
          <Box
            onClick={handleClearDate}
            sx={{
              fontSize: '13px',
              color: '#666',
              cursor: 'pointer',
              '&:hover': { color: '#1976d2' }
            }}
          >
            クリア
          </Box>
          <Box
            onClick={handleSelectToday}
            sx={{
              fontSize: '13px',
              color: '#666',
              cursor: 'pointer',
              '&:hover': { color: '#1976d2' }
            }}
          >
            今日
          </Box>
        </Box>
      </Box>
      
      );
    };

    const mergedSx = {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      ...sx?.input,
      '& .MuiTextField-root': { flex: 1 },
    };

    return (
      <Box sx={mergedSx}>
        <TextField
            fullWidth
            label={label}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={disabled || readOnly}
            helperText={helperText === false ? '' : helperText}
            slotProps={slotProps}
            sx={sx}
            ref={inputTextRef}
            error={validate ? validate(inputValue)?.length > 0 : false}
        />

        {!disabled && !readOnly && (
          <>
            <IconButton
              size="small"
              sx={{ color: 'rgba(0, 0, 0, 0.54)', cursor: 'pointer', padding: 0, border: '1px solid #CBCBCB', borderRadius: '0 5px 5px 0' }}
              onClick={handlePopoverOpen}
            >
              <CalendarTodayIcon  />
            </IconButton>

            <Popover
              open={Boolean(popoverAnchor)}
              anchorEl={popoverAnchor}
              onClose={handlePopoverClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{
                '& .MuiPopover-paper': {
                  padding: 0,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0'
                }
              }}
            >
              {renderDatePicker()}
            </Popover>
          </>
        )}
      </Box>
    );
  }
);

CustomDateInput.displayName = 'CustomDateInput';
export default CustomDateInput;