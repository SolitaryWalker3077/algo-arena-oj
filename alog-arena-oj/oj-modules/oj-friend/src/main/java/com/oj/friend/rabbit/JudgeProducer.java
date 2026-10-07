package com.oj.friend.rabbit;

import com.oj.api.entity.dto.JudgeSubmitDto;
import com.oj.common.constants.RabbitMQConstants;
import com.oj.common.enums.ResultCode;
import com.oj.security.expection.ServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JudgeProducer {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    //定义生产者
    public void produceMsg(JudgeSubmitDto judgeSubmitDTO) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConstants.OJ_WORK_QUEUE,
                    judgeSubmitDTO);
        } catch (Exception e) {
            log.error("⽣产者发送消息异常", e);
            throw new ServiceException(ResultCode.FAILED_RABBIT_PRODUCE);
        }
    }
}
