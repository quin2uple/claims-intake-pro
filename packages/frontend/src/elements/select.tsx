import React from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

interface SelectProps {
  label?: string;
  options: { value: string; label: string }[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  error,
  className,
}) => {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={cn('w-full', className)}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <Listbox value={value} onChange={onValueChange}>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button
              className={cn(
                'flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2',
                'text-sm text-left',
                selectedOption ? 'text-gray-900' : 'text-gray-500',
                'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'transition-colors',
                error && 'border-red-500 focus:ring-red-500'
              )}
            >
              <span className="block truncate">
                {selectedOption ? selectedOption.label : placeholder || 'Select...'}
              </span>
              <svg
                className={cn(
                  'h-4 w-4 text-gray-500 transition-transform duration-200',
                  open && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Listbox.Button>

            <Transition
              show={open}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options
                className={cn(
                  'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg',
                  'bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5',
                  'focus:outline-none'
                )}
              >
                {options.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option.value}
                    className={({ active, selected }) =>
                      cn(
                        'relative cursor-pointer select-none py-2 pl-3 pr-9',
                        'transition-colors',
                        active && 'bg-gray-100',
                        selected && 'bg-blue-50 text-blue-700 font-medium'
                      )
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}
                        >
                          {option.label}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
