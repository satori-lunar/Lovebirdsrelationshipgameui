import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Users, Heart } from 'lucide-react';

interface Partner {
  name: string;
  initials: string;
  relationshipStart: Date;
  syncStatus: 'connected' | 'syncing' | 'offline';
}

interface PartnerProfileProps {
  partner: Partner;
}

export function PartnerProfile({ partner }: PartnerProfileProps) {
  const daysTogether = Math.floor(
    (new Date().getTime() - partner.relationshipStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  const statusColor = {
    connected: 'bg-green-500',
    syncing: 'bg-yellow-500',
    offline: 'bg-gray-400'
  }[partner.syncStatus];

  const statusText = {
    connected: 'Connected',
    syncing: 'Syncing...',
    offline: 'Offline'
  }[partner.syncStatus];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Your Relationship
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg bg-pink-100 text-pink-700">
              {partner.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{partner.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
              <span className="text-sm text-muted-foreground">{statusText}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
              <span>Together for</span>
            </div>
            <Badge variant="secondary" className="text-base">
              {daysTogether} days
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
