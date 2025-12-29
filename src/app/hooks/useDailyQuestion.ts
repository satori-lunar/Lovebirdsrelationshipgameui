import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionService } from '../services/questionService';
import { useRelationship } from './useRelationship';
import { usePartner } from './usePartner';
import { useAuth } from './useAuth';

// Hook to manage daily questions for couples
export function useDailyQuestion() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const queryClient = useQueryClient();

  const { data: question, isLoading } = useQuery({
    queryKey: ['dailyQuestion', relationship?.id],
    queryFn: async () => {
      console.log('useDailyQuestion queryFn called, relationship:', relationship);
      if (!relationship) {
        console.log('No relationship, returning null');
        return null;
      }

      let todayQuestion = await questionService.getTodayQuestion(relationship.id);
      console.log('Today question result:', todayQuestion);

      if (!todayQuestion) {
        console.log('No today question, generating...');
        todayQuestion = await questionService.generateDailyQuestion(relationship.id);
      }

      console.log('Final question:', todayQuestion);
      return todayQuestion;
    },
    enabled: !!relationship,
  });

  const { data: userAnswer } = useQuery({
    queryKey: ['questionAnswer', question?.id, user?.id],
    queryFn: () => questionService.getUserAnswer(question!.id, user!.id),
    enabled: !!question && !!user,
  });

  const { data: userGuess } = useQuery({
    queryKey: ['questionGuess', question?.id, user?.id],
    queryFn: () => questionService.getUserGuess(question!.id, user!.id),
    enabled: !!question && !!user,
  });

  const { data: partnerAnswer } = useQuery({
    queryKey: ['partnerAnswer', question?.id, partnerId],
    queryFn: () => questionService.getPartnerAnswer(question!.id, partnerId!),
    enabled: !!question && !!partnerId && !!userAnswer && !!userGuess,
  });

  const saveAnswerMutation = useMutation({
    mutationFn: ({ answerText }: { answerText: string }) =>
      questionService.saveAnswer(question!.id, user!.id, answerText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionAnswer'] });
    },
  });

  const saveGuessMutation = useMutation({
    mutationFn: ({ guessText }: { guessText: string }) =>
      questionService.saveGuess(question!.id, user!.id, guessText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionGuess'] });
      queryClient.invalidateQueries({ queryKey: ['partnerAnswer'] });
    },
  });

  return {
    question,
    isLoading,
    userAnswer,
    userGuess,
    partnerAnswer,
    saveAnswer: saveAnswerMutation.mutate,
    saveGuess: saveGuessMutation.mutate,
    isSavingAnswer: saveAnswerMutation.isPending,
    isSavingGuess: saveGuessMutation.isPending,
    hasAnswered: !!userAnswer,
    hasGuessed: !!userGuess,
    canSeeFeedback: !!userAnswer && !!userGuess && !!partnerAnswer,
  };
}

