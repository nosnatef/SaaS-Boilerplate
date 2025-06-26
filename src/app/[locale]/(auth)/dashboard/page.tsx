'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { MessageState } from '@/features/dashboard/MessageState';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { SponsorLogos } from '@/features/sponsors/SponsorLogos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TokenResponse {
  tokenCount: number;
}

const DashboardIndexPage = () => {
  const t = useTranslations('DashboardIndex');
  const router = useRouter();
  const [tokenCount, setTokenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Error fetching token count:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
                {isLoading ? 'Loading...' : `${tokenCount} tokens remaining`}
              </Badge>
            </CardTitle>
            <CardDescription>
              You can create new content using your tokens. Each creation costs 1 token.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button 
              onClick={() => router.push('/dashboard/content/create')}
              disabled={tokenCount <= 0}
            >
              Create Content
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/dashboard/content')}
            >
              View My Creations
            </Button>
          </CardContent>
        </Card>

        <MessageState
          icon={(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M0 0h24v24H0z" stroke="none" />
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          )}
          title={t('message_state_title')}
          description={t.rich('message_state_description', {
            code: chunks => (
              <code className="bg-secondary text-secondary-foreground">
                {chunks}
              </code>
            ),
          })}
          button={(
            <>
              <div className="mt-2 text-xs font-light text-muted-foreground">
                {t.rich('message_state_alternative', {
                  url: () => (
                    <a
                      className="text-blue-500 hover:text-blue-600"
                      href="https://nextjs-boilerplate.com/pro-saas-starter-kit"
                    >
                      Next.js Boilerplate SaaS
                    </a>
                  ),
                })}
              </div>

              <div className="mt-7">
                <SponsorLogos />
              </div>
            </>
          )}
        />
      </div>
    </>
  );
};

export default DashboardIndexPage;
