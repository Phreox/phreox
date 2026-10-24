package talk.phreox.service.dm;

import talk.phreox.api.ServiceApi;
import talk.phreox.api.http.DELETE;
import talk.phreox.api.http.GET;
import talk.phreox.api.http.POST;
import talk.phreox.api.http.Path;
import talk.phreox.api.http.param.Body;
import talk.phreox.api.http.param.DefaultValue;
import talk.phreox.api.http.param.Header;
import talk.phreox.api.http.param.PathParam;
import talk.phreox.api.http.param.QueryParam;
import talk.phreox.service.auth.AccountService;

import java.util.List;
import java.util.UUID;

@Path("/conversations")
public final class ConversationController {

    private final AccountService accounts;
    private final ConversationService conversations;

    public ConversationController(AccountService accounts, ConversationService conversations) {
        this.accounts = accounts;
        this.conversations = conversations;
    }

    @POST
    public ServiceApi.ConversationView create(@Header("Authorization") String authorization, @Body ServiceApi.CreateConversationRequest request) {
        return conversations.create(accounts.authenticate(authorization).id(), request);
    }

    @GET
    public List<ServiceApi.ConversationView> list(@Header("Authorization") String authorization) {
        return conversations.list(accounts.authenticate(authorization).id());
    }

    @GET
    @Path("/{conversationId}")
    public ServiceApi.ConversationView get(@Header("Authorization") String authorization, @PathParam("conversationId") UUID conversationId) {
        return conversations.get(accounts.authenticate(authorization).id(), conversationId);
    }

    @POST
    @Path("/{conversationId}/members")
    public ServiceApi.ConversationView addMember(@Header("Authorization") String authorization, @PathParam("conversationId") UUID conversationId, @Body ServiceApi.MemberRequest request) {
        return conversations.addMember(accounts.authenticate(authorization).id(), conversationId, request);
    }

    @DELETE
    @Path("/{conversationId}/members/{accountId}")
    public void removeMember(@Header("Authorization") String authorization, @PathParam("conversationId") UUID conversationId, @PathParam("accountId") UUID accountId) {
        conversations.removeMember(accounts.authenticate(authorization).id(), conversationId, accountId);
    }

    @POST
    @Path("/{conversationId}/events")
    public ServiceApi.EventView send(@Header("Authorization") String authorization, @PathParam("conversationId") UUID conversationId, @Body ServiceApi.SendEventRequest request) {
        return conversations.send(accounts.authenticate(authorization).id(), conversationId, request);
    }

    @GET
    @Path("/{conversationId}/events")
    public ServiceApi.EventPage events(@Header("Authorization") String authorization, @PathParam("conversationId") UUID conversationId, @QueryParam("after") @DefaultValue("0") long after, @QueryParam("limit") @DefaultValue("50") int limit) {
        return conversations.events(accounts.authenticate(authorization).id(), conversationId, after, limit);
    }
}
