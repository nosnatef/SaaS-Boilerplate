'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';

import { TitleBar } from '@/features/dashboard/TitleBar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Banner, BannerTitle, BannerDescription } from '@/components/ui/banner';

interface TokenResponse {
  tokenCount: number;
}

interface BannerMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

const CreateContentPage = () => {
  const t = useTranslations('CreateContent');
  const router = useRouter();
  const [content, setContent] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banners, setBanners] = useState<BannerMessage[]>([]);

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
        // User doesn't have a subscription record - this shouldn't happen with Clerk webhook
        // but handle gracefully by setting token count to 0
        console.warn('No subscription found for user - should be created by Clerk webhook');
        setTokenCount(0);
        addBanner({
          type: 'warning',
          title: 'No Subscription Found',
          message: 'Your subscription record was not found. Please contact support.',
        });
      } else {
        addBanner({
          type: 'error',
          title: 'Token Error',
          message: 'Failed to fetch token count. Please refresh the page.',
        });
      }
    } catch (error) {
      addBanner({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to connect to the server. Please check your internet connection.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addBanner = (banner: Omit<BannerMessage, 'id'>) => {
    const id = Date.now().toString();
    setBanners(prev => [...prev, { ...banner, id }]);
  };

  const removeBanner = (id: string) => {
    setBanners(prev => prev.filter(banner => banner.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!content.trim()) {
      addBanner({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter some content.',
      });
      return;
    }

    if (tokenCount <= 0) {
      addBanner({
        type: 'error',
        title: 'Insufficient Tokens',
        message: 'You have no tokens remaining. Please purchase more tokens to continue.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

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
        addBanner({
          type: 'success',
          title: 'Content Created!',
          message: 'Your content has been created successfully.',
        });
        setTimeout(() => {
          router.push('/dashboard/content');
        }, 1500);
      } else {
        const errorData = await response.text();
        addBanner({
          type: 'error',
          title: 'Creation Error',
          message: errorData || 'Failed to create content. Please try again.',
        });
      }
    } catch (error) {
      addBanner({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to create content. Please check your internet connection and try again.',
      });
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

      {/* Banner Messages */}
      {banners.length > 0 && (
        <div className="mb-6 space-y-2">
          {banners.map((banner) => (
            <Banner
              key={banner.id}
              variant={banner.type === 'error' ? 'destructive' : banner.type}
              onDismiss={() => removeBanner(banner.id)}
            >
              <XCircle className="h-4 w-4" />
              <BannerTitle>{banner.title}</BannerTitle>
              <BannerDescription>{banner.message}</BannerDescription>
            </Banner>
          ))}
        </div>
      )}

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

              <Separator />

              <div className="flex justify-end gap-2">
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
                  disabled={isSubmitting || tokenCount <= 0}
                >
                  {isSubmitting ? t('creating_button') : t('create_button')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CreateContentPage; 