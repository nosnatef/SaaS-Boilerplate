'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { TitleBar } from '@/features/dashboard/TitleBar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TokenResponse {
  tokenCount: number;
}

const CreateContentPage = () => {
  const t = useTranslations('CreateContent');
  const router = useRouter();
  const [content, setContent] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTokenCount();
  }, []);

  const fetchTokenCount = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tokens');
      if (response.ok) {
        const data: TokenResponse = await response.json();
        setTokenCount(data.tokenCount);
      } else if (response.status === 404) {
        // User doesn't have tokens, initialize them
        const initResponse = await fetch('/api/tokens/init', {
          method: 'POST',
        });
        if (initResponse.ok) {
          const initData: TokenResponse = await initResponse.json();
          setTokenCount(initData.tokenCount);
        }
      } else {
        setError('Failed to fetch token count');
      }
    } catch (error) {
      setError('Failed to fetch token count');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }

    if (tokenCount <= 0) {
      setError('You have no tokens remaining. Please purchase more tokens to continue.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setTokenCount(data.remainingTokens);
        setContent('');
        router.push('/dashboard/content');
      } else {
        const errorData = await response.text();
        setError(errorData);
      }
    } catch (error) {
      setError('Failed to create content. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t('create_content_title')}
              <Badge variant={tokenCount > 0 ? 'default' : 'destructive'}>
                {isLoading ? 'Loading...' : `${tokenCount} tokens remaining`}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('create_content_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">{t('content_label')}</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                  placeholder={t('content_placeholder')}
                  className="min-h-[200px]"
                  disabled={isSubmitting || tokenCount <= 0}
                />
                <p className="text-sm text-muted-foreground">
                  {t('content_description')}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('token_cost_info')}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/content')}
                    disabled={isSubmitting}
                  >
                    {t('cancel_button')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || tokenCount <= 0 || !content.trim()}
                  >
                    {isSubmitting ? t('creating_button') : t('create_button')}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CreateContentPage; 