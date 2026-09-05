package com.oj.gateway.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@RefreshScope
@ConfigurationProperties(prefix = "security.ignore")
public class IgnoreWhiteProperties {

    /**
     * 放⾏⽩名单配置，⽹关不校验此处的⽩名单
     */
    private List<String> whites = new ArrayList<>();
    public List<String> getWhites() {
        return whites;
    }
    public void setWhites(List<String> whites) {
        this.whites = whites;
    }

}
