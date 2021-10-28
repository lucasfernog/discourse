# frozen_string_literal: true

class DiscourseAuthCookie
  class InvalidCookie < StandardError; end

  TOKEN_SIZE ||= 32

  TOKEN_KEY ||= "token"
  ID_KEY ||= "id"
  TL_KEY ||= "tl"
  TIME_KEY ||= "time"
  VALID_KEY ||= "valid"
  private_constant *%i[
    TOKEN_KEY
    ID_KEY
    TL_KEY
    TIME_KEY
    VALID_KEY
  ]

  attr_reader *%i[token user_id trust_level timestamp valid_for]

  def self.parse(raw_cookie, secret = Rails.application.secret_key_base)
    # v0 of the cookie was simply the auth token itself. we need this for
    # backward compatibility so we don't wipe out existing sessions
    return new(token: raw_cookie) if raw_cookie.size <= TOKEN_SIZE

    data, sig = raw_cookie.split("|", 2)
    validate_signature!(data, sig, secret)

    token = nil
    user_id = nil
    trust_level = nil
    timestamp = nil
    valid_for = nil

    data.split(",").each do |part|
      prefix, val = part.split(":", 2)
      val = val.presence
      if prefix == TOKEN_KEY
        token = val
      elsif prefix == ID_KEY
        user_id = val
      elsif prefix == TL_KEY
        trust_level = val
      elsif prefix == TIME_KEY
        timestamp = val
      elsif prefix == VALID_KEY
        valid_for = val
      end
    end

    new(
      token: token,
      user_id: user_id,
      trust_level: trust_level,
      timestamp: timestamp,
      valid_for: valid_for,
    )
  rescue InvalidCookie
    nil
  end

  def self.validate_signature!(data, sig, secret)
    data = data.to_s
    sig = sig.to_s
    if compute_signature(data, secret) != sig
      raise InvalidCookie.new
    end
  end

  def self.compute_signature(data, secret)
    OpenSSL::HMAC.hexdigest("sha256", secret, data)
  end

  def initialize(token:, user_id: nil, trust_level: nil, timestamp: nil, valid_for: nil)
    @token = token
    @user_id = user_id.to_i if user_id
    @trust_level = trust_level.to_i if trust_level
    @timestamp = timestamp.to_i if timestamp
    @valid_for = valid_for.to_i if valid_for

    validate!
  end

  def to_text(secret)
    parts = []
    parts << [TOKEN_KEY, token].join(":")
    parts << [ID_KEY, user_id].join(":")
    parts << [TL_KEY, trust_level].join(":")
    parts << [TIME_KEY, timestamp].join(":")
    parts << [VALID_KEY, valid_for].join(":")
    data = parts.join(",")
    [data, self.class.compute_signature(data, secret)].join("|")
  end

  private

  def validate!
    raise InvalidCookie.new if token.blank? || token.size != TOKEN_SIZE
    if valid_for && timestamp && timestamp + valid_for < Time.zone.now.to_i
      raise InvalidCookie.new
    end
  end
end
