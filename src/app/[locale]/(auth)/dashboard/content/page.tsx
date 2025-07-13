'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { TitleBar } from '@/features/dashboard/TitleBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageState } from '@/features/dashboard/MessageState';

interface TokenResponse {
  tokenCount: number;
}

interface ContentItem {
  id: number;
  content: string;
  createdBy: string;
  createdAt: string;
  isPublic: number;
}

interface ContentResponse {
  content: ContentItem[];
}

const ContentPage = () => {
  const t = useTranslations('Content');
  const router = useRouter();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [tokenCount, setTokenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch token count and content in parallel
      const [tokenResponse, contentResponse] = await Promise.all([
        fetch('/api/tokens'),
        fetch('/api/content')
      ]);

      if (tokenResponse.ok) {
        const tokenData: TokenResponse = await tokenResponse.json();
        setTokenCount(tokenData.tokenCount);
      } else if (tokenResponse.status === 404) {
        // User doesn't have a subscription record - this shouldn't happen with Clerk webhook
        // but handle gracefully by setting token count to 0
        console.warn('No subscription found for user - should be created by Clerk webhook');
        setTokenCount(0);
      }

      if (contentResponse.ok) {
        const contentData: ContentResponse = await contentResponse.json();
        setContent(contentData.content);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (contentId: number) => {
    if (!confirm(t('delete_confirmation'))) {
      return;
    }

    try {
      setIsDeleting(contentId);
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setContent(prev => prev.filter(item => item.id !== contentId));
        // Show success message (you could add a toast notification here)
      } else {
        console.error('Failed to delete content');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <>
        <TitleBar
          title={t('title_bar')}
          description={t('title_bar_description')}
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <div className="grid gap-6">
        {/* Token Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Token Status
              <Badge variant={tokenCount > 0 ? 'default' : 'destructive'}>
                {tokenCount} tokens remaining
              </Badge>
            </CardTitle>
            <CardDescription>
              You can create new content using your tokens. Each creation costs 1 token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/dashboard/content/create')}
              disabled={tokenCount <= 0}
            >
              {t('create_content_button')}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Content List */}
        {content.length === 0 ? (
          <MessageState
            icon={(
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            )}
            title={t('no_content')}
            description={t('no_content_description')}
            button={(
              <Button 
                onClick={() => router.push('/dashboard/content/create')}
                disabled={tokenCount <= 0}
              >
                {t('create_content_button')}
              </Button>
            )}
          />
        ) : (
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">Your Content</h2>
            {content.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {t('created_by')}: {item.createdBy}
                      </Badge>
                      <Badge variant="secondary">
                        {t('created_at')}: {formatDate(item.createdAt)}
                      </Badge>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting === item.id}
                    >
                      {isDeleting === item.id ? 'Deleting...' : t('delete_content_button')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h3 className="font-medium">{t('content_preview')}:</h3>
                    <div className="rounded-md bg-muted p-3 text-sm">
                      {truncateContent(item.content)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ContentPage; 