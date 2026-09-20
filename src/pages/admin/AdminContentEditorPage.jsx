import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Switch } from '@/components/forms/Switch';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

const PAGE_ROUTES = {
  homepage: 'homepage',
  about: 'about',
  faq: 'faq',
  contact: 'contact',
  delivery: 'delivery',
  banners: 'banners',
  announcements: 'announcements',
};

function normalizeForm(page, value = {}) {
  if (page === 'homepage') {
    return {
      announcement_message: value.announcement_message || '',
      announcement_active: value.announcement_active !== false,
      hero_headline: value.hero_headline || '',
      hero_supporting_text: value.hero_supporting_text || '',
      hero_image_url: value.hero_image_url || '',
    };
  }
  if (page === 'about') {
    return {
      title: value.title || '',
      intro: value.intro || '',
      mission: value.mission || '',
      vision: value.vision || '',
      body: value.body || '',
    };
  }
  if (page === 'faq') {
    return {
      title: value.title || '',
      intro: value.intro || '',
      itemsText: (value.items || [])
        .map((item) => `${item.question || ''}\n${item.answer || ''}`)
        .join('\n---\n'),
    };
  }
  if (page === 'contact') {
    return {
      title: value.title || '',
      intro: value.intro || '',
      form_note: value.form_note || '',
    };
  }
  if (page === 'delivery') {
    return {
      title: value.title || '',
      intro: value.intro || '',
      body: value.body || '',
      notes: value.notes || '',
    };
  }
  if (page === 'announcements') {
    return {
      message: value.message || '',
      active: value.active !== false,
    };
  }
  // banners
  return {
    itemsText: (value.items || [])
      .map(
        (item) =>
          `${item.title || ''}|${item.imageUrl || ''}|${item.link || ''}|${item.active === false ? 'off' : 'on'}`
      )
      .join('\n'),
  };
}

function parseFaqItems(text) {
  return String(text || '')
    .split(/\n---\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [question, ...rest] = block.split('\n');
      return {
        question: (question || '').trim(),
        answer: rest.join('\n').trim(),
      };
    })
    .filter((item) => item.question && item.answer);
}

function parseBannerItems(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, imageUrl, link, active] = line.split('|').map((part) => part.trim());
      return {
        title: title || '',
        imageUrl: imageUrl || '',
        link: link || '',
        active: active !== 'off',
      };
    })
    .filter((item) => item.title || item.imageUrl);
}

function formToPayload(page, form) {
  if (page === 'homepage') {
    return {
      announcement_message: form.announcement_message.trim(),
      announcement_active: form.announcement_active,
      hero_headline: form.hero_headline.trim() || null,
      hero_supporting_text: form.hero_supporting_text.trim() || null,
      hero_image_url: form.hero_image_url.trim() || null,
    };
  }
  if (page === 'about') {
    return {
      title: form.title.trim(),
      intro: form.intro.trim() || null,
      mission: form.mission.trim() || null,
      vision: form.vision.trim() || null,
      body: form.body.trim() || null,
    };
  }
  if (page === 'faq') {
    return {
      title: form.title.trim(),
      intro: form.intro.trim() || null,
      items: parseFaqItems(form.itemsText),
    };
  }
  if (page === 'contact') {
    return {
      title: form.title.trim(),
      intro: form.intro.trim() || null,
      form_note: form.form_note.trim() || null,
    };
  }
  if (page === 'delivery') {
    return {
      title: form.title.trim(),
      intro: form.intro.trim() || null,
      body: form.body.trim() || null,
      notes: form.notes.trim() || null,
    };
  }
  if (page === 'announcements') {
    return {
      message: form.message.trim(),
      active: form.active,
    };
  }
  return { items: parseBannerItems(form.itemsText) };
}

/**
 * CMS editor for homepage, about, FAQ, contact, banners, announcements.
 */
export function AdminContentEditorPage({ page: pageProp } = {}) {
  const params = useParams();
  const page = pageProp || params.page || 'homepage';
  const notify = useNotification();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [confirmSave, setConfirmSave] = useState(false);

  const valid = Object.prototype.hasOwnProperty.call(PAGE_ROUTES, page);

  const query = useQuery({
    queryKey: ['admin', 'content', page],
    enabled: valid,
    queryFn: async () => {
      const payload = await apiClient.get(`/admin/content?page=${page}`);
      return payload.data;
    },
  });

  useEffect(() => {
    if (query.data?.value) {
      setForm(normalizeForm(page, query.data.value));
    }
  }, [query.data, page]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = formToPayload(page, form);
      return apiClient.patch('/admin/content', { page, value });
    },
    onSuccess: () => {
      notify.success('Content saved');
      setConfirmSave(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'public'] });
      queryClient.invalidateQueries({ queryKey: ['content', 'public'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const title = useMemo(() => query.data?.label || page, [query.data, page]);

  if (!valid) {
    return (
      <ErrorState
        title="Unknown content page"
        description="Pick a page from Content in the sidebar."
      />
    );
  }

  if (query.isLoading || !form) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Unable to load content"
        description={query.error?.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">{title}</h1>
      <p className="mt-1 text-sm text-muted">{query.data?.description}</p>
      {page === 'homepage' ||
      page === 'about' ||
      page === 'faq' ||
      page === 'contact' ||
      page === 'delivery' ? (
        <p className="mt-2 text-sm text-muted">
          Public page:{' '}
          <Link
            to={page === 'homepage' ? '/' : `/${page}`}
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            View
          </Link>
        </p>
      ) : null}

      <form
        className="mt-6 max-w-2xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirmSave(true);
        }}
      >
        {page === 'homepage' && (
          <>
            <Switch
              label="Announcement active"
              checked={form.announcement_active}
              onChange={(checked) => setField('announcement_active', checked)}
            />
            <Input
              label="Announcement message"
              value={form.announcement_message}
              onChange={(e) => setField('announcement_message', e.target.value)}
            />
            <Input
              label="Hero headline"
              value={form.hero_headline}
              onChange={(e) => setField('hero_headline', e.target.value)}
              placeholder="Leave blank for default headline"
            />
            <Textarea
              label="Hero supporting text"
              value={form.hero_supporting_text}
              onChange={(e) => setField('hero_supporting_text', e.target.value)}
              rows={3}
            />
            <Input
              label="Hero image URL (optional override)"
              value={form.hero_image_url}
              onChange={(e) => setField('hero_image_url', e.target.value)}
            />
          </>
        )}

        {page === 'about' && (
          <>
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
            />
            <Textarea
              label="Intro"
              value={form.intro}
              onChange={(e) => setField('intro', e.target.value)}
              rows={3}
            />
            <Textarea
              label="Mission"
              value={form.mission}
              onChange={(e) => setField('mission', e.target.value)}
              rows={3}
            />
            <Textarea
              label="Vision"
              value={form.vision}
              onChange={(e) => setField('vision', e.target.value)}
              rows={3}
            />
            <Textarea
              label="Body"
              value={form.body}
              onChange={(e) => setField('body', e.target.value)}
              rows={5}
            />
          </>
        )}

        {page === 'faq' && (
          <>
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
            />
            <Textarea
              label="Intro"
              value={form.intro}
              onChange={(e) => setField('intro', e.target.value)}
              rows={2}
            />
            <Textarea
              label="FAQ items"
              hint="One item per block: question on first line, answer below. Separate items with ---"
              value={form.itemsText}
              onChange={(e) => setField('itemsText', e.target.value)}
              rows={12}
            />
          </>
        )}

        {page === 'contact' && (
          <>
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
            />
            <Textarea
              label="Intro"
              value={form.intro}
              onChange={(e) => setField('intro', e.target.value)}
              rows={3}
            />
            <Textarea
              label="Form note"
              value={form.form_note}
              onChange={(e) => setField('form_note', e.target.value)}
              rows={2}
            />
            <p className="text-sm text-muted">
              Phone, WhatsApp, and email come from{' '}
              <Link to="/admin/settings/business" className="underline">
                Business settings
              </Link>
              .
            </p>
          </>
        )}

        {page === 'delivery' && (
          <>
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
            />
            <Textarea
              label="Intro"
              value={form.intro}
              onChange={(e) => setField('intro', e.target.value)}
              rows={3}
            />
            <Textarea
              label="Body"
              value={form.body}
              onChange={(e) => setField('body', e.target.value)}
              rows={5}
            />
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
            />
          </>
        )}

        {page === 'announcements' && (
          <>
            <Switch
              label="Active"
              checked={form.active}
              onChange={(checked) => setField('active', checked)}
            />
            <Input
              label="Message"
              value={form.message}
              onChange={(e) => setField('message', e.target.value)}
              required
            />
          </>
        )}

        {page === 'banners' && (
          <Textarea
            label="Banners"
            hint="One per line: title|imageUrl|link|on/off"
            value={form.itemsText}
            onChange={(e) => setField('itemsText', e.target.value)}
            rows={10}
          />
        )}

        <Button type="submit" loading={saveMutation.isPending}>
          Save content
        </Button>
      </form>

      <ConfirmationDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        title="Save content?"
        confirmLabel="Save"
        onConfirm={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
      >
        <p className="text-sm text-muted">Published content updates without a code deploy.</p>
      </ConfirmationDialog>
    </div>
  );
}
