import { useState, type FormEvent } from 'react';
import { Field, describedBy } from '../components/Field';
import { ApiError, submitInquiry } from '../lib/api';
import { CATEGORIES, USER_TYPES } from '../lib/constants';
import { emptyValues, validateAll, validateField, type InquiryErrors, type InquiryValues } from '../lib/validate';

export function InquiryPage() {
  const [values, setValues] = useState<InquiryValues>(emptyValues);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  function change(field: keyof InquiryValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
  }

  function blur(field: keyof InquiryValues) {
    setErrors((current) => ({ ...current, [field]: validateField(field, values[field]) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const found = validateAll(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSending(true);
    try {
      await submitInquiry({
        userType: values.userType,
        category: values.category,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        message: values.message.trim(),
        website,
      });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(error.fields).filter(([key]) => key in values)));
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Try again later.');
      }
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setValues(emptyValues);
    setErrors({});
    setWebsite('');
    setFormError('');
    setDone(false);
  }

  if (done) {
    return (
      <section className="page narrow" aria-labelledby="done-heading">
        <h1 id="done-heading">Inquiry received</h1>
        <p>We have your inquiry and will reply by email or phone.</p>
        <button type="button" className="button" onClick={reset}>
          Submit another inquiry
        </button>
      </section>
    );
  }

  return (
    <section className="page narrow" aria-labelledby="form-heading">
      <h1 id="form-heading">Send an inquiry</h1>
      <form onSubmit={submit} noValidate>
        <Field id="userType" label="User type" error={errors.userType}>
          <select
            {...describedBy('userType', errors.userType)}
            value={values.userType}
            onChange={(e) => change('userType', e.target.value)}
            onBlur={() => blur('userType')}
          >
            <option value="">Select</option>
            {USER_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="category" label="Category" error={errors.category}>
          <select
            {...describedBy('category', errors.category)}
            value={values.category}
            onChange={(e) => change('category', e.target.value)}
            onBlur={() => blur('category')}
          >
            <option value="">Select</option>
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="name" label="Name" error={errors.name}>
          <input
            {...describedBy('name', errors.name)}
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => change('name', e.target.value)}
            onBlur={() => blur('name')}
          />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input
            {...describedBy('email', errors.email)}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => change('email', e.target.value)}
            onBlur={() => blur('email')}
          />
        </Field>
        <Field id="phone" label="Phone number" error={errors.phone}>
          <input
            {...describedBy('phone', errors.phone)}
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => change('phone', e.target.value)}
            onBlur={() => blur('phone')}
          />
        </Field>
        <Field id="message" label="Message" error={errors.message}>
          <textarea
            {...describedBy('message', errors.message)}
            rows={6}
            value={values.message}
            onChange={(e) => change('message', e.target.value)}
            onBlur={() => blur('message')}
          />
        </Field>

        <div className="trap" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
        <button type="submit" className="button" disabled={sending}>
          Submit inquiry
        </button>
      </form>
    </section>
  );
}
