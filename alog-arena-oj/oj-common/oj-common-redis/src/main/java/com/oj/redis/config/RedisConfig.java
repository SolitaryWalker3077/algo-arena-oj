package com.oj.redis.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@AutoConfiguration(before = RedisAutoConfiguration.class)
public class RedisConfig {

    @Bean(name = "redisTemplate")
    @ConditionalOnMissingBean(name = "redisTemplate")
    public RedisTemplate<Object, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<Object, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        JsonRedisSerializer<Object> valueSerializer = new JsonRedisSerializer<>(Object.class);


        RedisSerializer<String> keySerializer = new StringRedisSerializer();
        // 使⽤StringRedisSerializer来序列化和反序列化redis的key值
        template.setKeySerializer(keySerializer);
        template.setValueSerializer(valueSerializer);
        //Hash也使用StringRedisSerializer来实现序列化和反序列化redis的key值
        template.setHashKeySerializer(keySerializer);
        template.setHashValueSerializer(valueSerializer);
        template.afterPropertiesSet();
        return template;
    }
}
