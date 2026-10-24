package talk.phreox.space.guild;

public final class Invite {

    private final String code;
    private final int maxUses;

    private int uses;

    Invite(String code, int maxUses) {
        this.code = code;
        this.maxUses = maxUses;
    }

    public String code() {
        return code;
    }

    /** 0 means unlimited. */
    public int maxUses() {
        return maxUses;
    }

    public int uses() {
        return uses;
    }

    public boolean exhausted() {
        return maxUses > 0 && uses >= maxUses;
    }

    public void use() {
        uses++;
    }
}
