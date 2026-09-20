import { createContext, useContext, useId } from 'react';
import { cn } from '@/utils/cn';

const RadioGroupContext = createContext(null);

export function RadioGroup({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  children,
  className,
  ...props
}) {
  const generatedId = useId();
  const groupId = props.id || generatedId;
  const errorId = error ? `${groupId}-error` : undefined;

  return (
    <fieldset
      className={cn('min-w-0', className)}
      disabled={disabled}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={errorId}
      {...props}
    >
      {label ? (
        <legend className="mb-2 text-sm font-medium text-charcoal">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </legend>
      ) : null}
      <RadioGroupContext.Provider value={{ name, value, onChange, disabled, groupId }}>
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-labelledby={label ? undefined : groupId}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function RadioOption({
  value: optionValue,
  label,
  description,
  disabled = false,
  id,
  className,
  ...props
}) {
  const group = useContext(RadioGroupContext);
  const generatedId = useId();
  const optionId = id || generatedId;
  const descriptionId = description ? `${optionId}-description` : undefined;
  const isDisabled = disabled || group?.disabled;

  if (!group) {
    return (
      <Radio
        id={optionId}
        value={optionValue}
        label={label}
        description={description}
        disabled={disabled}
        className={className}
        {...props}
      />
    );
  }

  const checked = group.value === optionValue;

  return (
    <div className={cn('flex gap-3', className)}>
      <input
        id={optionId}
        type="radio"
        name={group.name}
        value={optionValue}
        checked={checked}
        disabled={isDisabled}
        onChange={() => group.onChange?.(optionValue)}
        aria-describedby={descriptionId}
        className={cn(
          'mt-0.5 size-4 shrink-0 border-border text-shield-red accent-shield-red',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        {...props}
      />
      <div className="min-w-0">
        {label ? (
          <label htmlFor={optionId} className="block text-sm font-medium text-charcoal">
            {label}
          </label>
        ) : null}
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-sm text-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function Radio({
  label,
  description,
  name,
  value,
  disabled = false,
  id,
  className,
  ...props
}) {
  const generatedId = useId();
  const radioId = id || generatedId;
  const descriptionId = description ? `${radioId}-description` : undefined;

  return (
    <div className={cn('flex gap-3', className)}>
      <input
        id={radioId}
        type="radio"
        name={name}
        value={value}
        disabled={disabled}
        aria-describedby={descriptionId}
        className={cn(
          'mt-0.5 size-4 shrink-0 border-border text-shield-red accent-shield-red',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        {...props}
      />
      <div className="min-w-0">
        {label ? (
          <label htmlFor={radioId} className="block text-sm font-medium text-charcoal">
            {label}
          </label>
        ) : null}
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-sm text-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
