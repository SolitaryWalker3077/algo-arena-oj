package com.oj.job.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.oj.job.entity.message.MessageText;
import com.oj.job.mapper.message.MessageTextMapper;
import com.oj.job.service.IMessageTextService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MessageTextServiceImpl extends ServiceImpl<MessageTextMapper, MessageText> implements IMessageTextService {
    @Override
    public boolean batchInsert(List<MessageText> messageTextList) {
        return saveBatch(messageTextList);
    }

}
