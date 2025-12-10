import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Delete, Add, Block } from "@mui/icons-material";
import * as api from "../services/api";
import { Member, Exclusion } from "../types";

interface ExclusionsManagerProps {
  raffleId: string;
  members: Member[];
  isOwner: boolean;
}

export const ExclusionsManager = ({ raffleId, members, isOwner }: ExclusionsManagerProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [participantA, setParticipantA] = useState("");
  const [participantB, setParticipantB] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: exclusions, isLoading } = useQuery({
    queryKey: ["exclusions", raffleId],
    queryFn: () => api.getExclusions(raffleId),
    enabled: isOwner,
  });

  const createMutation = useMutation({
    mutationFn: (data: { participant_a_id: string; participant_b_id: string }) =>
      api.createExclusion(raffleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exclusions", raffleId] });
      setAddDialogOpen(false);
      setParticipantA("");
      setParticipantB("");
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || t("exclusions.errorCreate"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (exclusionId: string) => api.deleteExclusion(raffleId, exclusionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exclusions", raffleId] });
    },
  });

  const handleAddExclusion = () => {
    if (!participantA || !participantB) {
      setError(t("exclusions.selectBothParticipants"));
      return;
    }
    if (participantA === participantB) {
      setError(t("exclusions.cannotExcludeSelf"));
      return;
    }
    createMutation.mutate({
      participant_a_id: participantA,
      participant_b_id: participantB,
    });
  };

  if (!isOwner) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
              <Block color="action" />
              {t("exclusions.title")}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setAddDialogOpen(true)}
              size="small"
              sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
            >
              {t("exclusions.add")}
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {t("exclusions.description")}
          </Alert>

          {exclusions && exclusions.length > 0 ? (
            <List sx={{ p: 0 }}>
              {exclusions.map((exclusion) => (
                <ListItem
                  key={exclusion.id}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    mb: 1,
                    px: { xs: 1, sm: 2 },
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => deleteMutation.mutate(exclusion.id)}
                      disabled={deleteMutation.isPending}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  }
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, flex: 1 }}>
                    <ListItemAvatar>
                      <Avatar src={exclusion.participant_a.avatar_url || undefined} sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                        {exclusion.participant_a.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <Typography sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>{exclusion.participant_a.name}</Typography>

                    <Typography color="text.secondary" sx={{ mx: { xs: 0.5, sm: 1 }, fontSize: { xs: "0.875rem", sm: "1rem" } }}>⇄</Typography>

                    <ListItemAvatar>
                      <Avatar src={exclusion.participant_b.avatar_url || undefined} sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                        {exclusion.participant_b.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <Typography sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>{exclusion.participant_b.name}</Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 3, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
              {t("exclusions.noExclusions")}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Add Exclusion Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("exclusions.addDialogTitle")}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3, mt: 1 }}>
            {t("exclusions.addDialogInfo")}
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t("exclusions.participant1")}</InputLabel>
            <Select
              value={participantA}
              onChange={(e) => setParticipantA(e.target.value)}
              label={t("exclusions.participant1")}
            >
              {members.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar src={member.avatarUrl || undefined} sx={{ width: 24, height: 24 }}>
                      {member.name[0]}
                    </Avatar>
                    {member.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>{t("exclusions.participant2")}</InputLabel>
            <Select
              value={participantB}
              onChange={(e) => setParticipantB(e.target.value)}
              label={t("exclusions.participant2")}
            >
              {members.map((member) => (
                <MenuItem key={member.id} value={member.id} disabled={member.id === participantA}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar src={member.avatarUrl || undefined} sx={{ width: 24, height: 24 }}>
                      {member.name[0]}
                    </Avatar>
                    {member.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleAddExclusion}
            disabled={createMutation.isPending || !participantA || !participantB}
          >
            {createMutation.isPending ? t("exclusions.adding") : t("exclusions.add")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

